import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, requireUser } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { getApiCreditPack, getCliLicenseTier } from "@/lib/billing-products";
import {
  createAsaasCheckout,
  createAsaasCustomer,
  createAsaasPixPayment,
  formatDateOnly,
  getAsaasCheckoutUrl,
  getAsaasPixQrCode,
  normalizeCpfCnpj,
  resolveAsaasPixExpirationDate,
} from "@/lib/asaas";
import { serializeBillingTransaction } from "@/lib/payment-fulfillment";

const db = prisma as any;

const schema = z.object({
  category: z.enum(["api_credit", "cli_license"]),
  productId: z.string().min(3),
  paymentMethod: z.enum(["pix", "credit"]),
  cpfCnpj: z.string().trim().optional(),
}).superRefine((value, ctx) => {
  if (value.paymentMethod === "pix") {
    const digits = normalizeCpfCnpj(value.cpfCnpj || "");
    if (digits.length !== 11 && digits.length !== 14) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cpfCnpj"],
        message: "Informe um CPF ou CNPJ válido para gerar o Pix.",
      });
    }
  }
});

function buildCallbackUrl(pathname: string, transactionId: string, result: "success" | "canceled" | "expired") {
  const baseUrl = process.env.APP_URL?.trim();
  if (!baseUrl) {
    throw new ApiError("APP_URL não configurada para redirecionamento do checkout.", 500);
  }

  const url = new URL(pathname, baseUrl);
  url.searchParams.set("transaction", transactionId);
  url.searchParams.set("result", result);
  return url.toString();
}

function getProductDefinition(category: "api_credit" | "cli_license", productId: string) {
  if (category === "api_credit") {
    const pack = getApiCreditPack(productId);
    if (!pack) throw new ApiError("Pack de créditos não encontrado", 404);
    return {
      displayName: `Hydra API ${pack.name}`,
      amount: pack.price,
      creditsGranted: pack.credits,
      description: pack.description,
      redirectPath: "/api-panel",
    };
  }

  const tier = getCliLicenseTier(productId);
  if (!tier) throw new ApiError("Licença CLI não encontrada", 404);
  return {
    displayName: tier.name,
    amount: tier.price,
    creditsGranted: 0,
    description: tier.description,
    redirectPath: "/cli-panel",
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const parsed = schema.parse(body);
    const product = getProductDefinition(parsed.category, parsed.productId);

    const transaction = await db.paymentTransaction.create({
      data: {
        userId: user.id,
        planId: null,
        productType: parsed.category,
        productRef: parsed.productId,
        displayName: product.displayName,
        paymentMethod: parsed.paymentMethod,
        amount: product.amount,
        quantity: 1,
        creditsGranted: product.creditsGranted,
        installments: null,
        status: "pending",
        paymentLink: null,
        pixCode: null,
        expiresAt: null,
        metadata: JSON.stringify({ externalReference: null }),
      },
    });

    if (parsed.paymentMethod === "pix") {
      const now = new Date();
      const cpfCnpj = normalizeCpfCnpj(parsed.cpfCnpj || "");
      const customer = await createAsaasCustomer({
        name: user.name,
        email: user.email,
        cpfCnpj,
        externalReference: user.id,
        notificationDisabled: true,
      });

      const payment = await createAsaasPixPayment({
        customer: customer.id,
        billingType: "PIX",
        value: Number(product.amount.toFixed(2)),
        dueDate: formatDateOnly(now),
        description: `${product.displayName} - HYDRA AI`,
        externalReference: transaction.id,
        callback: {
          successUrl: buildCallbackUrl(product.redirectPath, transaction.id, "success"),
          cancelUrl: buildCallbackUrl(product.redirectPath, transaction.id, "canceled"),
          expiredUrl: buildCallbackUrl(product.redirectPath, transaction.id, "expired"),
        },
      });

      const qrCode = await getAsaasPixQrCode(payment.id);
      const pixQrCodeImage = qrCode.encodedImage ? `data:image/png;base64,${qrCode.encodedImage}` : null;

      const updatedTransaction = await db.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: String(payment.status || "pending").toLowerCase(),
          paymentLink: payment.invoiceUrl || null,
          pixCode: qrCode.payload || null,
          expiresAt: resolveAsaasPixExpirationDate(qrCode.expirationDate, now),
          metadata: JSON.stringify({
            externalReference: transaction.id,
            asaasCustomerId: customer.id,
            asaasPaymentId: payment.id,
            asaasStatus: payment.status || null,
            pixQrCodeImage,
          }),
        },
      });

      return NextResponse.json({ transaction: serializeBillingTransaction(updatedTransaction) }, { status: 201 });
    }

    const checkout = await createAsaasCheckout({
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["DETACHED"],
      minutesToExpire: 60,
      externalReference: transaction.id,
      callback: {
        successUrl: buildCallbackUrl(product.redirectPath, transaction.id, "success"),
        cancelUrl: buildCallbackUrl(product.redirectPath, transaction.id, "canceled"),
        expiredUrl: buildCallbackUrl(product.redirectPath, transaction.id, "expired"),
      },
      items: [
        {
          name: product.displayName,
          description: `${product.displayName} - HYDRA AI`,
          quantity: 1,
          value: Number(product.amount.toFixed(2)),
        },
      ],
    });

    const checkoutUrl = getAsaasCheckoutUrl(checkout.id, checkout.link);
    const updatedTransaction = await db.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        paymentLink: checkoutUrl,
        metadata: JSON.stringify({
          externalReference: transaction.id,
          asaasCheckoutId: checkout.id,
          asaasCheckoutUrl: checkoutUrl,
        }),
      },
    });

    return NextResponse.json({ transaction: serializeBillingTransaction(updatedTransaction) }, { status: 201 });
  } catch (error: unknown) {
    const status = error instanceof ApiError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Erro ao iniciar compra";
    return NextResponse.json({ error: message }, { status });
  }
}
