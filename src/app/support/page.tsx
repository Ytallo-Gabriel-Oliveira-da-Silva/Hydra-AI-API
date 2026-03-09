"use client";

import { SiteFooter } from "@/components/site-footer";
import { LifeBuoy, Loader2, Mail, Send } from "lucide-react";
import { useState } from "react";

const categories = ["Acesso", "Pagamento", "Conta", "Bug", "Integração", "Outro"];

export default function SupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, category, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao enviar suporte");
      setSuccess(data.message || "Pedido enviado ao suporte.");
      setMessage("");
      setSubject("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-6 py-12 text-slate-50">
      <div className="mx-auto max-w-5xl space-y-10">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <div className="flex items-center gap-3 text-cyan-200">
            <LifeBuoy className="h-5 w-5" />
            <span className="text-sm">Central de ajuda HYDRA</span>
          </div>
          <h1 className="mt-4 text-4xl font-semibold text-white">Fale com o suporte</h1>
          <p className="mt-3 max-w-2xl text-slate-200">
            Use este formulário para relatar bugs, pedir ajuda com pagamento, acesso, integrações ou qualquer problema operacional.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
            <Field label="Nome">
              <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:outline-none" />
            </Field>
            <Field label="E-mail">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:outline-none" />
            </Field>
            <Field label="Assunto">
              <input value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={4} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:outline-none" />
            </Field>
            <Field label="Categoria">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:outline-none">
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Mensagem">
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} required minLength={20} rows={8} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white focus:outline-none" />
              </Field>
            </div>

            {error && <p className="md:col-span-2 text-sm text-rose-300">{error}</p>}
            {success && <p className="md:col-span-2 text-sm text-emerald-300">{success}</p>}

            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <button disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {loading ? "Enviando..." : "Enviar pedido"}
              </button>
              <div className="inline-flex items-center gap-2 text-sm text-slate-300">
                <Mail className="h-4 w-4" />
                support@hydra-ai.shop
              </div>
            </div>
          </form>
        </section>

        <SiteFooter />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-slate-200">{label}</span>
      {children}
    </label>
  );
}