import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addYears } from "date-fns";
import { requireUser, ApiError } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { getPlanAmount } from "@/lib/plans";
import {
  createAsaasCheckout,
  createAsaasCustomer,
  createAsaasPixPayment,
  formatDateOnly,
  getAsaasCheckoutUrl,
  getAsaasPixQrCode,
  normalizeCpfCnpj,
} from "@/lib/asaas";

const db = prisma as any;

const schema = z.object({
  planSlug: z.string().min(2),
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

function getSubscriptionCycle(planSlug: string) {
  return planSlug === "annual" ? "YEARLY" : "MONTHLY";
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const parsed = schema.parse(body);
    const plan = await prisma.plan.findUnique({ where: { slug: parsed.planSlug } });
    if (!plan) throw new ApiError("Plano não encontrado", 404);
    if (plan.slug === "free") throw new ApiError("Plano Free não requer pagamento", 400);

    const amount = getPlanAmount(plan.monthlyPrice, plan.yearlyPrice, plan.slug);

    const transaction = await db.paymentTransaction.create({
      data: {
        userId: user.id,
        planId: plan.id,
        paymentMethod: parsed.paymentMethod,
        amount,
        installments: null,
        status: "pending",
        paymentLink: null,
        pixCode: null,
        expiresAt: null,
        metadata: JSON.stringify({ externalReference: null }),
      },
    });

    if (parsed.paymentMethod === "pix") {
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
        value: Number(amount.toFixed(2)),
        dueDate: formatDateOnly(new Date()),
        description: `Assinatura ${plan.name} - HYDRA AI`,
        externalReference: transaction.id,
      });

      const qrCode = await getAsaasPixQrCode(payment.id);
      const pixQrCodeImage = qrCode.encodedImage
        ? `data:image/png;base64,${qrCode.encodedImage}`
        : null;

      const updatedTransaction = await db.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: String(payment.status || "pending").toLowerCase(),
          paymentLink: payment.invoiceUrl || null,
          pixCode: qrCode.payload || null,
          expiresAt: qrCode.expirationDate ? new Date(qrCode.expirationDate) : null,
          metadata: JSON.stringify({
            externalReference: transaction.id,
            asaasCustomerId: customer.id,
            asaasPaymentId: payment.id,
            asaasStatus: payment.status || null,
            pixQrCodeImage,
          }),
        },
      });

      return NextResponse.json({
        transaction: {
          id: updatedTransaction.id,
          status: updatedTransaction.status,
          paymentMethod: updatedTransaction.paymentMethod,
          amount: updatedTransaction.amount,
          paymentLink: updatedTransaction.paymentLink,
          pixCode: updatedTransaction.pixCode,
          expiresAt: updatedTransaction.expiresAt,
          pixQrCodeImage,
          asaasStatus: payment.status || null,
        },
      });
    }

    const checkout = await createAsaasCheckout({
      billingTypes: ["CREDIT_CARD"],
      chargeTypes: ["RECURRENT"],
      minutesToExpire: 60,
      externalReference: transaction.id,
      callback: {
        successUrl: buildCallbackUrl(`/plans/${plan.slug}`, transaction.id, "success"),
        cancelUrl: buildCallbackUrl(`/plans/${plan.slug}`, transaction.id, "canceled"),
        expiredUrl: buildCallbackUrl(`/plans/${plan.slug}`, transaction.id, "expired"),
      },
      items: [
        {
          name: plan.name,
          description: `Assinatura ${plan.name} - HYDRA AI`,
          quantity: 1,
          value: Number(amount.toFixed(2)),
        },
      ],
      subscription: {
        cycle: getSubscriptionCycle(plan.slug),
        nextDueDate: formatDateOnly(new Date()),
        endDate: formatDateOnly(addYears(new Date(), 10)),
      },
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

    return NextResponse.json({
      transaction: {
        id: updatedTransaction.id,
        status: updatedTransaction.status,
        paymentMethod: updatedTransaction.paymentMethod,
        amount: updatedTransaction.amount,
        installments: updatedTransaction.installments,
        paymentLink: updatedTransaction.paymentLink,
        pixCode: updatedTransaction.pixCode,
        expiresAt: updatedTransaction.expiresAt,
        checkoutUrl,
      },
    });
  } catch (error: unknown) {
    const status = error instanceof ApiError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Erro ao iniciar pagamento";
    return NextResponse.json({ error: message }, { status });
  }
}
