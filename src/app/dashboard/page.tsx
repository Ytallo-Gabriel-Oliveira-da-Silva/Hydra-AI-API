"use client";

import {
  AlertCircle,
  Bell,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Loader2,
  MessageSquare,
  Mic,
  Palette,
  PlayCircle,
  Plus,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  Wand2,
  Workflow,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import type { CSSProperties, ElementType, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { getMessagePreview, isEncodedMediaMessage, parseMediaMessage, type AudioMessagePayload, type VideoMessagePayload } from "@/lib/media";

type ThemePreset = {
  id: string;
  label: string;
  accentFrom: string;
  accentTo: string;
  surface: string;
  wire: string;
};

const themes: ThemePreset[] = [
  { id: "light", label: "Claro Futurista", accentFrom: "#82d0ff", accentTo: "#5c7dff", surface: "rgba(255,255,255,0.08)", wire: "rgba(255,255,255,0.18)" },
  { id: "dark", label: "Dark Neon", accentFrom: "#7b6cff", accentTo: "#12b5ff", surface: "rgba(19,21,35,0.75)", wire: "rgba(255,255,255,0.1)" },
  { id: "lilac", label: "Lilás", accentFrom: "#d4b3ff", accentTo: "#8b5cf6", surface: "rgba(40,15,68,0.6)", wire: "rgba(212,179,255,0.28)" },
  { id: "purple", label: "Roxo Tech", accentFrom: "#b94bff", accentTo: "#5312b5", surface: "rgba(27,7,53,0.7)", wire: "rgba(185,75,255,0.24)" },
  { id: "black-red", label: "Preto + Vermelho", accentFrom: "#ff3b3b", accentTo: "#6b0505", surface: "rgba(18,3,6,0.7)", wire: "rgba(255,59,59,0.25)" },
  { id: "blue-black", label: "Azul + Preto", accentFrom: "#3aa0ff", accentTo: "#0b2f68", surface: "rgba(6,12,25,0.7)", wire: "rgba(58,160,255,0.22)" },
  { id: "green-black", label: "Verde + Preto", accentFrom: "#4ade80", accentTo: "#064e3b", surface: "rgba(5,16,10,0.7)", wire: "rgba(74,222,128,0.2)" },
];

const nav = [
  { id: "chat", label: "Novo chat", icon: Plus },
  { id: "gallery", label: "Imagens", icon: ImageIcon },
  { id: "projects", label: "Projetos", icon: ListChecks },
  { id: "investigations", label: "Investigações", icon: Workflow },
  { id: "apps", label: "Aplicativos", icon: LayoutDashboard },
];

const settings = [
  "Geral",
  "Notificações",
  "Personalização",
  "Aplicativos",
  "Agendamentos",
  "Controlar dados",
  "Segurança",
  "Controles Parentais",
  "Conta",
];

const projects = [
  { name: "Vision Guardian", status: "Ativo", progress: 86 },
  { name: "AudioForge", status: "Beta", progress: 64 },
  { name: "Pesquisa Rápida", status: "Em rascunho", progress: 42 },
];

const investigations = [
  "Mapear ameaças zero-day para IoT",
  "Comparar LLMs para sumarização jurídica",
  "Pipeline de áudio multi-idioma com cache edge",
];

const defaultSettingsState: SettingsState = {
  general: { appearance: "Sistema", accent: "Padrão", language: "Autodetectar", spoken: "Autodetectar", voice: "Voz padrão", separateVoice: false },
  notifications: {
    responses: "Push",
    groups: "Push",
    tasks: "Push, e-mail",
    projects: "E-mail",
    recommendations: "Push, e-mail",
    usage: "Push, e-mail",
  },
  personalization: {
    tone: "Padrão",
    traits: [],
    instructions: "",
    nickname: "",
    occupation: "",
    about: "",
    memorySaved: true,
    memoryHistory: true,
    recordingsHistory: true,
    webSearch: true,
    board: true,
    advancedVoice: true,
  },
  apps: { enabled: [], developerMode: false },
  schedules: { enabled: false, note: "Agende execuções futuras" },
  data: { improveModel: true, remoteData: true, sharedLinks: true },
  security: { mfaApp: false, mfaSms: false, trustedDevices: true },
  parental: { members: [] },
  account: { email: "", plan: "Free", renewal: "", domains: [] },
};

type ChatMessage = { role: "user" | "assistant"; content: string };
type ConversationPreview = { id: string; title: string; messages: ChatMessage[] };

type NotificationPrefs = {
  push: boolean;
  email: boolean;
  webhook: boolean;
};

type DataPrefs = {
  exportable: boolean;
  parental: boolean;
};

type PlanConfig = {
  contractEmail: string;
  financeReference: string;
};

type BillingNotice = {
  planExpired: boolean;
  expiredPlanName: string | null;
  expiredAt: string | null;
  reason: "renewal_failed" | "manual_renewal_required" | null;
};

type SavedIntegration = {
  name: string;
  domain?: string | null;
  hasKey?: boolean;
};

type GalleryItem = { id: string; title: string; url: string; createdAt: string };

type MediaViewerState =
  | { kind: "image"; url: string; title: string; subtitle?: string }
  | { kind: "video"; url: string; title: string; subtitle?: string }
  | null;

type SettingsState = {
  general: {
    appearance: string;
    accent: string;
    language: string;
    spoken: string;
    voice: string;
    separateVoice: boolean;
  };
  notifications: {
    responses: string;
    groups: string;
    tasks: string;
    projects: string;
    recommendations: string;
    usage: string;
  };
  personalization: {
    tone: string;
    traits: string[];
    instructions: string;
    nickname: string;
    occupation: string;
    about: string;
    memorySaved: boolean;
    memoryHistory: boolean;
    recordingsHistory: boolean;
    webSearch: boolean;
    board: boolean;
    advancedVoice: boolean;
  };
  apps: {
    enabled: string[];
    developerMode: boolean;
  };
  schedules: {
    enabled: boolean;
    note: string;
  };
  data: {
    improveModel: boolean;
    remoteData: boolean;
    sharedLinks: boolean;
  };
  security: {
    mfaApp: boolean;
    mfaSms: boolean;
    trustedDevices: boolean;
  };
  parental: {
    members: string[];
  };
  account: {
    email: string;
    plan: string;
    renewal: string;
    domains: string[];
  };
};

export default function DashboardPage() {
  const [theme, setTheme] = useState<ThemePreset>(themes[1]);
  const [voiceOn, setVoiceOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [micAllowed, setMicAllowed] = useState(false);
  const [camAllowed, setCamAllowed] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("chat");
  const [showSettings, setShowSettings] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [history, setHistory] = useState<ConversationPreview[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [domainsError, setDomainsError] = useState<string | null>(null);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);
  const [savedIntegrations, setSavedIntegrations] = useState<SavedIntegration[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("Usuário HYDRA");
  const [profilePlan, setProfilePlan] = useState("Free");
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({ push: true, email: false, webhook: true });
  const [dataPrefs, setDataPrefs] = useState<DataPrefs>({ exportable: true, parental: false });
  const [planConfig, setPlanConfig] = useState<PlanConfig>({ contractEmail: "", financeReference: "" });
  const [planSaved, setPlanSaved] = useState(false);
  const [settingsState, setSettingsState] = useState<SettingsState>(defaultSettingsState);
  const [activeSettingsTab, setActiveSettingsTab] = useState<string>("general");
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [billingNotice, setBillingNotice] = useState<BillingNotice>({ planExpired: false, expiredPlanName: null, expiredAt: null, reason: null });
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceReplyLoading, setVoiceReplyLoading] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<MediaViewerState>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const settingsHydratedRef = useRef(false);
  const saveSettingsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { recentAudios, recentVideos } = useMemo(() => {
    const payloads = messages
      .filter((msg) => msg.role === "assistant")
      .map((msg) => parseMediaMessage(msg.content))
      .filter((payload): payload is AudioMessagePayload | VideoMessagePayload => !!payload && payload.kind !== "image");

    return {
      recentAudios: payloads.filter((payload): payload is AudioMessagePayload => payload.kind === "audio"),
      recentVideos: payloads.filter((payload): payload is VideoMessagePayload => payload.kind === "video"),
    };
  }, [messages]);

  const surfaceStyle = useMemo(
    () => ({ "--accent-from": theme.accentFrom, "--accent-to": theme.accentTo } as CSSProperties),
    [theme],
  );

  const backgroundStyle = useMemo(
    () => ({
      background:
        `radial-gradient(circle at 15% 20%, ${theme.accentFrom}22 0, transparent 30%),` +
        `radial-gradient(circle at 80% 10%, ${theme.accentTo}33 0, transparent 34%),` +
        `radial-gradient(circle at 50% 80%, ${theme.accentFrom}1f 0, transparent 28%),` +
        "linear-gradient(135deg, #05060a 0%, #070911 45%, #040712 100%)",
    }),
    [theme],
  );

  const workspaceHeight = "calc(100vh - 4rem)";

  useEffect(() => {
    async function checkPermissions() {
      if (typeof navigator === "undefined" || !navigator.permissions) return;
      try {
        const mic = await navigator.permissions.query({ name: "microphone" as PermissionName });
        const cam = await navigator.permissions.query({ name: "camera" as PermissionName });
        setMicAllowed(mic.state === "granted");
        setCamAllowed(cam.state === "granted");
      } catch {
        // ignore
      }
    }
    checkPermissions();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedPrefs = localStorage.getItem("hydra_prefs");
      if (storedPrefs) {
        const parsed = JSON.parse(storedPrefs) as { notificationPrefs: NotificationPrefs; dataPrefs: DataPrefs };
        if (parsed.notificationPrefs) setNotificationPrefs(parsed.notificationPrefs);
        if (parsed.dataPrefs) setDataPrefs(parsed.dataPrefs);
      }
      const storedPlan = localStorage.getItem("hydra_plan_config");
      if (storedPlan) {
        const parsedPlan = JSON.parse(storedPlan) as PlanConfig;
        setPlanConfig(parsedPlan);
      }
      const storedSettings = localStorage.getItem("hydra_settings_state");
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings) as SettingsState;
        setSettingsState(parsed);
      }
    } catch {
      // ignore localStorage parsing errors
    }
    loadHistory();
    loadAccount();
    loadDomains();
    loadIntegrations();
    loadGallery();
    loadPersistedSettings();
    loadFamilyMembers();
  }, []);

  useEffect(() => {
    if (showSettings) {
      loadAccount();
      loadDomains();
      loadIntegrations();
      loadFamilyMembers();
    }
  }, [showSettings]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("hydra_prefs", JSON.stringify({ notificationPrefs, dataPrefs }));
  }, [notificationPrefs, dataPrefs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("hydra_plan_config", JSON.stringify(planConfig));
  }, [planConfig]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("hydra_settings_state", JSON.stringify(settingsState));
  }, [settingsState]);

  useEffect(() => {
    if (!settingsHydratedRef.current) return;
    if (saveSettingsTimeoutRef.current) clearTimeout(saveSettingsTimeoutRef.current);
    saveSettingsTimeoutRef.current = setTimeout(() => {
      void persistSettings();
    }, 500);

    return () => {
      if (saveSettingsTimeoutRef.current) clearTimeout(saveSettingsTimeoutRef.current);
    };
  }, [settingsState, notificationPrefs, dataPrefs, planConfig]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = mediaViewer ? "hidden" : previous;
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mediaViewer]);

  async function loadPersistedSettings() {
    try {
      const res = await fetch("/api/settings", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar configurações");
      if (data.settings) {
        if (data.settings.settingsState) {
          setSettingsState((prev: SettingsState) => ({
            ...prev,
            ...data.settings.settingsState,
            apps: {
              ...prev.apps,
              ...data.settings.settingsState.apps,
              enabled: prev.apps.enabled,
            },
            parental: prev.parental,
            account: prev.account,
          }));
        }
        if (data.settings.notificationPrefs) setNotificationPrefs(data.settings.notificationPrefs as NotificationPrefs);
        if (data.settings.dataPrefs) setDataPrefs(data.settings.dataPrefs as DataPrefs);
        if (data.settings.planConfig) setPlanConfig(data.settings.planConfig as PlanConfig);
      }
    } catch {
      // fallback to local state when backend settings are absent
    } finally {
      settingsHydratedRef.current = true;
    }
  }

  async function persistSettings() {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          settings: {
            settingsState: {
              ...settingsState,
              parental: defaultSettingsState.parental,
              account: defaultSettingsState.account,
              apps: {
                ...settingsState.apps,
                enabled: [],
              },
            },
            notificationPrefs,
            dataPrefs,
            planConfig,
          },
        }),
      });
    } catch {
      // keep local cache if backend save fails
    }
  }

  async function loadGallery() {
    try {
      setGalleryLoading(true);
      setGalleryError(null);
      const res = await fetch("/api/image", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar galeria");
      setGalleryItems((data.images as GalleryItem[] | undefined) || []);
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : "Erro ao carregar galeria");
    } finally {
      setGalleryLoading(false);
    }
  }

  async function loadAccount() {
    setAccountLoading(true);
    setAccountError(null);
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      if (res.status === 401) {
        setAccountError("Sessão expirada ou ausente. Faça login novamente.");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Não autenticado");
      const renewal = data.renewalAt ? new Date(data.renewalAt).toLocaleDateString("pt-BR") : "";
      const planLabel = data.plan?.name || data.plan?.slug || "Free";
      const nextBillingNotice: BillingNotice = {
        planExpired: Boolean(data.billingNotice?.planExpired),
        expiredPlanName: data.billingNotice?.expiredPlanName || null,
        expiredAt: data.billingNotice?.expiredAt || null,
        reason: data.billingNotice?.reason || null,
      };
      setProfileName(data.name || "Usuário HYDRA");
      setProfilePlan(planLabel);
      setBillingNotice(nextBillingNotice);
      setSettingsState((s) => ({
        ...s,
        personalization: {
          ...s.personalization,
          nickname: data.name || s.personalization.nickname,
        },
        account: {
          ...s.account,
          email: data.email || s.account.email,
          plan: planLabel,
          renewal,
        },
      }));
      setAccountError(null);
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "Erro ao carregar conta");
    } finally {
      setAccountLoading(false);
    }
  }

  async function loadFamilyMembers() {
    setFamilyLoading(true);
    setFamilyError(null);
    try {
      const res = await fetch("/api/family-members", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar membros da família");
      const members: string[] = data.members || [];
      setSettingsState((s) => ({ ...s, parental: { ...s.parental, members } }));
    } catch (err) {
      setFamilyError(err instanceof Error ? err.message : "Erro ao carregar membros da família");
    } finally {
      setFamilyLoading(false);
    }
  }

  async function addFamilyMember(value: string) {
    if (!value.trim()) return;
    setFamilyError(null);
    try {
      const res = await fetch("/api/family-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar membro");
      await loadFamilyMembers();
    } catch (err) {
      setFamilyError(err instanceof Error ? err.message : "Erro ao salvar membro");
    }
  }

  async function removeFamilyMember(value: string) {
    setFamilyError(null);
    try {
      const res = await fetch("/api/family-members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao remover membro");
      setSettingsState((s) => ({ ...s, parental: { ...s.parental, members: s.parental.members.filter((member) => member !== value) } }));
    } catch (err) {
      setFamilyError(err instanceof Error ? err.message : "Erro ao remover membro");
    }
  }

  async function loadDomains() {
    setDomainsLoading(true);
    setDomainsError(null);
    try {
      const res = await fetch("/api/account/domains", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar domínios");
      const list: string[] = data.domains || [];
      setSettingsState((s) => ({ ...s, account: { ...s.account, domains: list } }));
    } catch (err) {
      setDomainsError(err instanceof Error ? err.message : "Erro ao carregar domínios");
    } finally {
      setDomainsLoading(false);
    }
  }

  function normalizeDomain(input: string) {
    const trimmed = input.trim().toLowerCase();
    const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
    const withoutPath = withoutProtocol.split("/")[0];
    return withoutPath.replace(/\.$/, "");
  }

  async function addDomain(domain: string) {
    if (!domain.trim()) return;
    setDomainsError(null);
    try {
      const cleaned = normalizeDomain(domain);
      const res = await fetch("/api/account/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: cleaned }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar domínio");
      await loadDomains();
    } catch (err) {
      setDomainsError(err instanceof Error ? err.message : "Erro ao salvar domínio");
    }
  }

  async function removeDomain(domain: string) {
    setDomainsError(null);
    try {
      const cleaned = normalizeDomain(domain);
      const res = await fetch("/api/account/domains", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: cleaned }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao remover domínio");
      setSettingsState((s) => ({ ...s, account: { ...s.account, domains: s.account.domains.filter((d) => d !== domain) } }));
    } catch (err) {
      setDomainsError(err instanceof Error ? err.message : "Erro ao remover domínio");
    }
  }

  async function loadIntegrations() {
    setIntegrationsLoading(true);
    setIntegrationsError(null);
    try {
      const res = await fetch("/api/account/integrations", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar integrações");
      const integrations = (data.integrations as SavedIntegration[] | undefined) || [];
      const names: string[] = integrations.map((i) => i.name);
      setSavedIntegrations(integrations);
      setSettingsState((s) => ({ ...s, apps: { ...s.apps, enabled: names } }));
    } catch (err) {
      setIntegrationsError(err instanceof Error ? err.message : "Erro ao carregar integrações");
    } finally {
      setIntegrationsLoading(false);
    }
  }

  async function addIntegration(name: string, apiKey?: string, domain?: string) {
    if (!name.trim() || (!apiKey?.trim() && !domain?.trim())) return;
    setIntegrationsError(null);
    try {
      const res = await fetch("/api/account/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, apiKey, domain }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar integração");
      await loadIntegrations();
    } catch (err) {
      setIntegrationsError(err instanceof Error ? err.message : "Erro ao salvar integração");
    }
  }

  async function removeIntegration(name: string) {
    setIntegrationsError(null);
    try {
      const res = await fetch("/api/account/integrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao remover integração");
      setSettingsState((s) => ({ ...s, apps: { ...s.apps, enabled: s.apps.enabled.filter((t) => t !== name) } }));
    } catch (err) {
      setIntegrationsError(err instanceof Error ? err.message : "Erro ao remover integração");
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar histórico");
      const convs = (data.conversations as any[]) || [];
      const mapped: ConversationPreview[] = convs.map((c) => ({
        id: c.id,
        title: c.title,
        messages: (c.messages as { role: string; content: string }[] | undefined)?.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })) || [],
      }));
      setHistory(mapped);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Erro ao carregar histórico");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadConversation(id: string) {
    setSelected("chat");
    setChatError(null);
    setSending(false);
    try {
      const res = await fetch(`/api/chat?conversationId=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar conversa");
      setConversationId(id);
      const mapped = (data.conversation?.messages as { role: string; content: string }[] | undefined)?.map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: m.content,
      }));
      setMessages(mapped || []);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Erro ao carregar conversa");
    }
  }

  function startNewChat() {
    setConversationId(null);
    setMessages([]);
    setInput("");
    setChatError(null);
    setSelected("chat");
  }

  async function sendMessage() {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setChatError(null);
    const optimisticUser = { role: "user" as const, content: text };
    setMessages((prev) => [...prev, optimisticUser]);
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: conversationId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar mensagem");
      const reply = data.reply as string;
      const newId = (data.conversationId as string) || conversationId;
      setConversationId(newId);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      if (parseMediaMessage(reply)?.kind === "image") void loadGallery();
      loadHistory();
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Erro ao enviar mensagem");
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  async function requestMedia(kind: "audio" | "video") {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    try {
      setPermissionsError(null);
      const stream = await navigator.mediaDevices.getUserMedia(kind === "audio" ? { audio: true } : { video: true });
      stream.getTracks().forEach((track) => track.stop());
      if (kind === "audio") setMicAllowed(true);
      if (kind === "video") setCamAllowed(true);
    } catch {
      setPermissionsError(kind === "audio" ? "Permissão de microfone negada. Libere o microfone no navegador para usar voz." : "Permissão de câmera negada. Libere a câmera no navegador para usar recursos visuais.");
    }
  }

  async function requestMediaPermissions() {
    await requestMedia("audio");
    await requestMedia("video");
  }

  function speakWithBrowser(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  async function playTextAudio(text: string) {
    const audioRes = await fetch("/api/audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const audioData = await audioRes.json();

    if (!audioRes.ok) {
      const usedBrowserSpeech = speakWithBrowser(text);
      if (!usedBrowserSpeech) throw new Error(audioData.error || "Erro ao gerar áudio");
      return;
    }

    const audio = new Audio(audioData.audio as string);
    await audio.play();
  }

  async function handleVoiceToText() {
    if (!micAllowed) await requestMedia("audio");
    if (!micAllowed) return;
    if (transcribing) return;
    try {
      setTranscribing(true);
      const recorded = await recordOnce();
      if (!recorded) return;
      const res = await fetch("/api/stt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: recorded.base64, mime: recorded.mime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao transcrever");
      setInput((prev) => `${prev ? prev + " " : ""}${data.text}`.trim());
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Erro ao transcrever áudio");
    } finally {
      setTranscribing(false);
    }
  }

  async function handleVoiceConversation() {
    if (!micAllowed) await requestMedia("audio");
    if (!micAllowed) return;
    try {
      setVoiceReplyLoading(true);
      const recorded = await recordOnce();
      if (!recorded) return;
      const sttRes = await fetch("/api/stt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: recorded.base64, mime: recorded.mime }),
      });
      const sttData = await sttRes.json();
      if (!sttRes.ok) throw new Error(sttData.error || "Erro ao transcrever");
      const text = sttData.text as string;
      setInput(text);

      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId }),
      });
      const chatData = await chatRes.json();
      if (!chatRes.ok) throw new Error(chatData.error || "Erro ao responder");
      const reply = chatData.reply as string;
      const newId = (chatData.conversationId as string) || conversationId;
      setConversationId(newId);
      setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: reply }]);

      await playTextAudio(getSpeakableResponse(reply));
      loadHistory();
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Erro na conversa por voz");
    } finally {
      setVoiceReplyLoading(false);
    }
  }

  function savePlanConfiguration() {
    setPlanSaved(true);
    setTimeout(() => setPlanSaved(false), 1800);
  }

  return (
    <div className="min-h-screen text-slate-50" style={backgroundStyle}>
      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-8">
        <aside
          className="sticky top-8 flex w-72 shrink-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/30 p-4 backdrop-blur"
          style={{ height: workspaceHeight }}
        >
          <button
            onClick={startNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            <Plus className="h-4 w-4" />
            Novo chat
          </button>

          <div className="mt-4 space-y-1">
            {nav.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item.id)}
                className={clsx(
                  "group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                  selected === item.id ? "bg-white/10 text-white" : "text-slate-200 hover:bg-white/5",
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {selected === item.id && <Sparkles className="h-4 w-4 text-amber-300" />}
              </button>
            ))}
          </div>

          <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden">
            <p className="text-xs uppercase tracking-wide text-slate-400">Histórico</p>
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="space-y-1">
                {historyLoading && <p className="rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300">Carregando histórico...</p>}
                {historyError && (
                  <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-amber-200">
                    <AlertCircle className="h-4 w-4" />
                    <span>{historyError}</span>
                  </div>
                )}
                {!historyLoading && !historyError && history.length === 0 && (
                  <p className="rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300">Sem conversas ainda.</p>
                )}
                {history.map((h) => {
                  const lastMessage = h.messages?.[h.messages.length - 1]?.content || h.messages?.[0]?.content;
                  const preview = getMessagePreview(lastMessage || "") || "Sem mensagens";
                  return (
                    <button
                      key={h.id}
                      onClick={() => loadConversation(h.id)}
                      className="flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                    >
                      <MessageSquare className="h-4 w-4 text-slate-400" />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="truncate text-xs font-semibold text-white">{h.title || "Sem título"}</p>
                        <p className="truncate break-all text-[11px] text-slate-400">{preview}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-fuchsia-500 opacity-80" />
              <User className="relative m-auto mt-2 h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-300">{profileName}</p>
              <div className="flex items-center gap-2 text-xs text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                <span>{profilePlan}</span>
              </div>
            </div>
            <button
              className="ml-auto rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
              onClick={() => setShowSettings(true)}
            >
              Configurações
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col" style={{ minHeight: workspaceHeight }}>
          <div className="relative grid gap-4 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] xl:items-stretch">
            <div className="flex min-h-[168px] flex-col justify-between rounded-3xl border border-white/10 bg-white/5 px-6 py-5 shadow-xl backdrop-blur-sm">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-300">Modo</p>
              <div className="space-y-2">
                <p className="text-[clamp(2rem,3vw,3rem)] font-semibold leading-none text-white">HYDRA AI</p>
                <p className="text-lg font-medium text-slate-200">Multimodal</p>
              </div>
              <p className="text-sm text-slate-400">Chat, voz, câmera e mídia em um único workspace.</p>
            </div>

            <div className="flex min-h-[168px] flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur-sm">
              <div className="grid gap-3 md:grid-cols-2">
                {(!micAllowed || !camAllowed) ? (
                  <button
                    onClick={requestMediaPermissions}
                    className="flex min-h-[72px] items-center justify-center rounded-2xl border border-amber-300/40 bg-amber-400/10 px-4 py-3 text-center text-sm font-semibold text-amber-100 transition hover:bg-amber-400/15"
                  >
                    Permitir microfone e câmera
                  </button>
                ) : (
                  <div className="flex min-h-[72px] items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100">
                    Permissões de mídia liberadas
                  </div>
                )}

                <button
                  onClick={() => setShowThemes((v) => !v)}
                  className="flex min-h-[72px] items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-cyan-400/15"
                >
                  <Palette className="h-4 w-4" />
                  <span>Tema: {theme.label}</span>
                  <Sparkles className="h-4 w-4 text-amber-300" />
                </button>

                <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
                  <div className="flex min-h-[60px] items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                    <ToggleChip
                      icon={Mic}
                      label={micAllowed ? "Voz" : "Voz (pedir permissão)"}
                      active={voiceOn}
                      onToggle={async () => {
                        if (!voiceOn && !micAllowed) await requestMedia("audio");
                        setVoiceOn((p) => !p);
                      }}
                    />
                  </div>
                  <div className="flex min-h-[60px] items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                    <ToggleChip
                      icon={Camera}
                      label={camAllowed ? "Câmera" : "Câmera (pedir permissão)"}
                      active={cameraOn}
                      onToggle={async () => {
                        if (!cameraOn && !camAllowed) await requestMedia("video");
                        setCameraOn((p) => !p);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {showThemes && (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] z-20 w-64 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl xl:right-4">
                {themes.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setTheme(preset);
                      setShowThemes(false);
                    }}
                    className={clsx(
                      "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition",
                      theme.id === preset.id ? "bg-white/10 text-white" : "text-slate-200 hover:bg-white/5",
                    )}
                  >
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: preset.accentFrom }} />
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {permissionsError && (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              {permissionsError}
            </div>
          )}

          <div className="mt-6 flex-1">
          {selected === "chat" && (
            <div className="flex h-full flex-col gap-4">
              <motion.div whileHover={{ y: -3 }} className="flex min-h-[calc(100vh-13.5rem)] flex-col rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl" style={surfaceStyle}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="text-left">
                    <h1 className="text-3xl font-semibold text-white">Pronto para conversar com a HYDRA AI?</h1>
                    <p className="mt-1 text-slate-200">Pergunte qualquer coisa ou continue um chat multimodal.</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={startNewChat}
                      className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                    >
                      Novo chat limpo
                    </button>
                    {conversationId && <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-slate-200">ID ativo: {conversationId.slice(0, 8)}</span>}
                  </div>
                </div>

                <div className="mt-4 min-h-[240px] flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/5 bg-black/20 p-4 text-left">
                  {messages.length === 0 && (
                    <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                      <Sparkles className="h-4 w-4 text-amber-300" />
                      <div>
                        <p className="font-semibold text-white">Pergunte algo como:</p>
                        <p className="text-xs text-slate-300">"gere uma imagem de uma flor cyberpunk", "crie um áudio falando olá mundo" ou "gere um vídeo de chuva neon"</p>
                      </div>
                    </div>
                  )}
                  {messages.map((msg, idx) => (
                    <MessageBubble
                      key={`${msg.role}-${idx}-${msg.content.slice(0, 8)}`}
                      role={msg.role}
                      content={msg.content}
                      accent={theme.accentFrom}
                      onOpenMedia={(viewer) => setMediaViewer(viewer)}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {chatError && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                    <AlertCircle className="h-4 w-4" />
                    <span>{chatError}</span>
                  </div>
                )}

                <div className="mx-auto mt-4 w-full max-w-4xl rounded-3xl border border-white/10 bg-black/35 p-4 shadow-xl backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-slate-200">
                      <Plus className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        rows={2}
                        className="min-h-[84px] w-full resize-none bg-transparent text-base leading-relaxed text-white placeholder:text-slate-500 focus:outline-none"
                        placeholder="Pergunte alguma coisa"
                      />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                        <p className="text-xs text-slate-400">Enter envia, Shift+Enter quebra linha.</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleVoiceToText}
                            disabled={transcribing}
                            className={clsx(
                              "rounded-2xl p-3 text-white transition",
                              transcribing ? "bg-white/10" : "bg-white/15 hover:bg-white/25",
                            )}
                            title="Falar e transcrever"
                          >
                            {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                          </button>
                          <button
                            disabled={sending || !input.trim()}
                            onClick={sendMessage}
                            className={clsx(
                              "rounded-2xl p-3 text-white transition",
                              sending || !input.trim() ? "bg-white/10" : "bg-white/20 hover:bg-white/30",
                            )}
                          >
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={handleVoiceConversation}
                            disabled={voiceReplyLoading}
                            className={clsx(
                              "rounded-2xl p-3 text-white transition",
                              voiceReplyLoading ? "bg-emerald-400/20" : "bg-emerald-500/30 hover:bg-emerald-500/40",
                            )}
                            title="Falar e ouvir a resposta"
                          >
                            {voiceReplyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Workspace</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-cyan-100">Chat multimodal ativo</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Histórico persistente</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Mídia integrada</span>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">
                    Ambiente organizado para conversas, geração de mídia e continuidade de contexto, mantendo a leitura do histórico limpa e a operação centralizada.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Plano</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{profilePlan}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {billingNotice.planExpired && billingNotice.expiredAt
                      ? `Plano expirado em ${new Date(billingNotice.expiredAt).toLocaleDateString("pt-BR")}`
                      : settingsState.account.renewal
                        ? `Renovação em ${settingsState.account.renewal}`
                        : "Sem cobrança recorrente no momento."}
                  </p>
                  {billingNotice.planExpired && (
                    <div className="mt-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-100">
                      {billingNotice.reason === "manual_renewal_required"
                        ? `Seu plano ${billingNotice.expiredPlanName || "pago"} terminou e o pagamento via Pix não renova automaticamente.`
                        : `Seu plano ${billingNotice.expiredPlanName || "pago"} expirou porque a renovação automática no cartão não foi aprovada.`}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link href="/plans" className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20">
                      Ver planos
                    </Link>
                    <Link href="/plans" className="flex items-center gap-1 rounded-xl border border-white/20 px-3 py-2 text-xs text-white hover:bg-white/10">
                      <Copy className="h-3.5 w-3.5" />
                      Ver contratação
                    </Link>
                  </div>
                  {planSaved && (
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] text-emerald-200">
                      <Check className="h-3.5 w-3.5" />
                      Preferências comerciais salvas
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {selected === "gallery" && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card title="Galeria de imagens" icon={ImageIcon} theme={theme}>
                <p className="text-sm text-slate-200">Guarde e baixe tudo que o bot cria. Biblioteca pessoal com acesso rápido.</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {galleryLoading && <p className="text-xs text-slate-300">Carregando imagens...</p>}
                  {galleryError && <p className="text-xs text-amber-200">{galleryError}</p>}
                  {!galleryLoading && galleryItems.length === 0 && !galleryError && (
                    <p className="text-xs text-slate-300">Nenhuma imagem gerada ainda. Peça no chat algo como "gere uma imagem de uma flor negra".</p>
                  )}
                  {galleryItems.map((item) => (
                    <div key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                      <div className="h-24 bg-cover bg-center" style={{ backgroundImage: `url(${item.url})` }} />
                      <div className="flex items-center justify-between px-3 py-2 text-xs">
                        <span className="text-slate-100">{item.title}</span>
                        <button onClick={() => downloadAsset(item.url, "hydra-image.png")} className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-white">
                          <Download className="h-3.5 w-3.5" />
                          Baixar
                        </button>
                        <button
                          onClick={() => setMediaViewer({ kind: "image", url: item.url, title: item.title || "Imagem gerada" })}
                          className="flex items-center gap-1 rounded-full border border-white/20 px-2 py-1 text-white hover:bg-white/10"
                        >
                          Abrir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2 text-xs text-slate-200">
                  <Badge label="Text-to-Image" color={theme.accentFrom} />
                  <Badge label="Inpainting" color={theme.accentTo} />
                </div>
              </Card>

              <Card title="Áudios gerados" icon={Mic} theme={theme}>
                <p className="text-sm text-slate-200">Ouça e baixe os áudios criados na conversa atual.</p>
                <div className="mt-3 space-y-3">
                  {recentAudios.length === 0 && <p className="text-xs text-slate-300">Ainda não há áudios nesta conversa. Peça no chat para criar um áudio.</p>}
                  {recentAudios.map((item, index) => (
                    <div key={`${item.audioUrl}-${index}-${item.text.slice(0, 16)}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-sm font-semibold text-white">Áudio gerado</p>
                      <p className="mt-1 text-xs text-slate-300">{item.text}</p>
                      <audio controls className="mt-3 w-full" src={item.audioUrl} preload="metadata" />
                      <button onClick={() => downloadAsset(item.audioUrl, "hydra-audio.mp3")} className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15">
                        <Download className="h-3.5 w-3.5" />
                        Baixar áudio
                      </button>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Vídeos gerados" icon={PlayCircle} theme={theme}>
                <p className="text-sm text-slate-200">Assista e baixe os vídeos criados na conversa atual.</p>
                <div className="mt-3 space-y-3">
                  {recentVideos.length === 0 && <p className="text-xs text-slate-300">Ainda não há vídeos nesta conversa. Peça no chat para gerar um vídeo.</p>}
                  {recentVideos.map((item, index) => (
                    <div key={`${item.taskId || item.url}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-sm font-semibold text-white">Vídeo gerado</p>
                      <p className="mt-1 text-xs text-slate-300">{item.prompt}</p>
                      <video controls playsInline className="mt-3 max-h-56 w-full rounded-2xl bg-black/40" src={item.url} preload="metadata" />
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => downloadAsset(item.url, "hydra-video.mp4")} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15">
                          <Download className="h-3.5 w-3.5" />
                          Baixar vídeo
                        </button>
                        <button
                          onClick={() => setMediaViewer({ kind: "video", url: item.url, title: "Vídeo gerado", subtitle: item.prompt })}
                          className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
                        >
                          Abrir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {mediaViewer && (
            <MediaViewerModal
              viewer={mediaViewer}
              onClose={() => setMediaViewer(null)}
              onDownload={() => downloadAsset(mediaViewer.url, mediaViewer.kind === "image" ? "hydra-image.png" : "hydra-video.mp4")}
            />
          )}

          {selected === "projects" && (
            <Card title="Projetos" icon={Workflow} theme={theme}>
              <div className="space-y-3">
                {projects.map((proj) => (
                  <div key={proj.name} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{proj.name}</p>
                        <p className="text-xs text-slate-300">{proj.status}</p>
                      </div>
                      <span className="text-xs text-slate-200">{proj.progress}%</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400" style={{ width: `${proj.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-200">
                <Rocket className="h-4 w-4 text-amber-300" />
                <span>Criar e compartilhar workspaces</span>
              </div>
            </Card>
          )}

          {selected === "investigations" && (
            <Card title="Investigações" icon={Search} theme={theme}>
              <ul className="space-y-2 text-sm text-slate-200">
                {investigations.map((item) => (
                  <li key={item} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-200">
                <ListChecks className="h-4 w-4 text-emerald-300" />
                <span>Briefing, fontes, rastreabilidade.</span>
              </div>
            </Card>
          )}

          {selected === "apps" && (
            <Card title="Aplicativos e integrações" icon={Settings} theme={theme}>
              <p className="text-sm text-slate-200">Conecte ferramentas (ex: GitHub, Jira, Linear) por chave/API ou por domínio autorizado. Use o mesmo conjunto salvo nas Configurações.</p>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <IntegrationForm onAdd={addIntegration} loading={integrationsLoading} />
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold text-white">Integrados</p>
                  <p className="text-xs text-slate-400">Clique no “x” para remover</p>
                  {integrationsError && <p className="mt-1 text-xs text-amber-200">{integrationsError}</p>}
                  <div className="mt-2 space-y-2">
                    {savedIntegrations.length === 0 ? (
                      <p className="text-xs text-slate-400">Nenhum item.</p>
                    ) : (
                      savedIntegrations.map((integration) => (
                        <div key={integration.name} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{integration.name}</p>
                            <p className="text-xs text-slate-300">
                              {integration.domain ? `Domínio: ${integration.domain}` : integration.hasKey ? "Autorizado por API key" : "Sem credencial"}
                            </p>
                          </div>
                          <button onClick={() => removeIntegration(integration.name)} className="text-slate-300 hover:text-white">×</button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-3 text-xs text-slate-300">Modo dev: {settingsState.apps.developerMode ? "Ativo" : "Desligado"}</div>
                </div>
              </div>
            </Card>
          )}
          </div>
        </main>
      </div>

      <footer className="border-t border-white/10 bg-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>HYDRA AI Workspace</p>
          <p>Painel multimodal com histórico persistente, mídia integrada e operações centralizadas.</p>
          <p>{new Date().getFullYear()} HYDRA AI</p>
        </div>
      </footer>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10">
          <div className="w-full max-w-6xl rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <Settings className="h-5 w-5 text-cyan-200" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Configurações</p>
                  <p className="text-lg font-semibold text-white">Conta, notificações e dados</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 grid grid-cols-[220px_1fr] gap-4 flex-1 min-h-0">
              <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3 h-fit sticky top-6">
                {[
                  { id: "general", label: "Geral" },
                  { id: "notifications", label: "Notificações" },
                  { id: "personalization", label: "Personalização" },
                  { id: "apps", label: "Aplicativos" },
                  { id: "schedules", label: "Agendamentos" },
                  { id: "data", label: "Controlar dados" },
                  { id: "security", label: "Segurança" },
                  { id: "parental", label: "Controles parentais" },
                  { id: "account", label: "Conta" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSettingsTab(item.id)}
                    className={clsx(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition",
                      activeSettingsTab === item.id ? "bg-white/10 text-white" : "text-slate-200 hover:bg-white/5",
                    )}
                  >
                    <span>{item.label}</span>
                    {activeSettingsTab === item.id && <Sparkles className="h-4 w-4 text-amber-300" />}
                  </button>
                ))}
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4 overflow-y-auto max-h-[70vh] pr-2">
                {activeSettingsTab === "general" && (
                  <div className="space-y-3">
                    <SectionTitle title="Geral" subtitle="Aparência, idioma e voz" />
                    <SelectRow
                      label="Aparência"
                      value={settingsState.general.appearance}
                      onChange={(v) => setSettingsState((s) => ({ ...s, general: { ...s.general, appearance: v } }))}
                      options={["Sistema", "Claro", "Escuro"]}
                    />
                    <SelectRow
                      label="Cor de ênfase"
                      value={settingsState.general.accent}
                      onChange={(v) => setSettingsState((s) => ({ ...s, general: { ...s.general, accent: v } }))}
                      options={["Padrão", "Roxo", "Verde", "Azul"]}
                    />
                    <SelectRow
                      label="Idioma"
                      value={settingsState.general.language}
                      onChange={(v) => setSettingsState((s) => ({ ...s, general: { ...s.general, language: v } }))}
                      options={["Autodetectar", "Português", "Inglês", "Espanhol"]}
                    />
                    <SelectRow
                      label="Linguagem falada"
                      value={settingsState.general.spoken}
                      onChange={(v) => setSettingsState((s) => ({ ...s, general: { ...s.general, spoken: v } }))}
                      options={["Autodetectar", "Português", "Inglês"]}
                    />
                  </div>
                )}

                {activeSettingsTab === "notifications" && (
                  <div className="space-y-3">
                    <SectionTitle title="Notificações" subtitle="Como avisar você" />
                    {[
                      { key: "responses", label: "Respostas" },
                      { key: "groups", label: "Conversas em grupo" },
                      { key: "tasks", label: "Tarefas" },
                      { key: "projects", label: "Projetos" },
                      { key: "recommendations", label: "Recomendações" },
                      { key: "usage", label: "Uso" },
                    ].map((item) => (
                      <SelectRow
                        key={item.key}
                        label={item.label}
                        value={(settingsState.notifications as any)[item.key] as string}
                        onChange={(v) => setSettingsState((s) => ({
                          ...s,
                          notifications: { ...s.notifications, [item.key]: v },
                        }))}
                        options={["Push", "E-mail", "Push, e-mail", "Desativado"]}
                      />
                    ))}
                    <ToggleRow
                      label="Alertas automáticos"
                      description="Receber sinais operacionais e atualizações do ambiente"
                      value={notificationPrefs.webhook}
                      onChange={(v) => setNotificationPrefs((prev) => ({ ...prev, webhook: v }))}
                    />
                  </div>
                )}

                {activeSettingsTab === "personalization" && (
                  <div className="space-y-3">
                    <SectionTitle title="Personalização" subtitle="Tom, características e instruções" />
                    <SelectRow
                      label="Estilo e tom"
                      value={settingsState.personalization.tone}
                      onChange={(v) => setSettingsState((s) => ({ ...s, personalization: { ...s.personalization, tone: v } }))}
                      options={["Padrão", "Acolhedor", "Entusiasmado", "Formal", "Sucinto"]}
                    />
                    <MultiToggleRow
                      label="Características"
                      options={["Listas", "Cabeçalhos", "Emoji"]}
                      values={settingsState.personalization.traits}
                      onChange={(vals) => setSettingsState((s) => ({ ...s, personalization: { ...s.personalization, traits: vals } }))}
                    />
                    <TextAreaRow
                      label="Instruções personalizadas"
                      value={settingsState.personalization.instructions}
                      onChange={(v) => setSettingsState((s) => ({ ...s, personalization: { ...s.personalization, instructions: v } }))}
                      placeholder="Conte como responder, preferências de tom, contexto."
                    />
                    <InputRow
                      label="Apelido"
                      value={settingsState.personalization.nickname}
                      onChange={(v) => setSettingsState((s) => ({ ...s, personalization: { ...s.personalization, nickname: v } }))}
                    />
                    <InputRow
                      label="Ocupação"
                      value={settingsState.personalization.occupation}
                      onChange={(v) => setSettingsState((s) => ({ ...s, personalization: { ...s.personalization, occupation: v } }))}
                    />
                    <TextAreaRow
                      label="Mais sobre você"
                      value={settingsState.personalization.about}
                      onChange={(v) => setSettingsState((s) => ({ ...s, personalization: { ...s.personalization, about: v } }))}
                      placeholder="Preferências, objetivos, limites."
                    />
                    <ToggleRow
                      label="Memória salva"
                      description="Permitir memorizar e referenciar"
                      value={settingsState.personalization.memorySaved}
                      onChange={(v) => setSettingsState((s) => ({ ...s, personalization: { ...s.personalization, memorySaved: v } }))}
                    />
                    <ToggleRow
                      label="Histórico de chats"
                      description="Referenciar conversas anteriores"
                      value={settingsState.personalization.memoryHistory}
                      onChange={(v) => setSettingsState((s) => ({ ...s, personalization: { ...s.personalization, memoryHistory: v } }))}
                    />
                    <ToggleRow
                      label="Histórico de gravações"
                      description="Usar transcrições anteriores"
                      value={settingsState.personalization.recordingsHistory}
                      onChange={(v) => setSettingsState((s) => ({ ...s, personalization: { ...s.personalization, recordingsHistory: v } }))}
                    />
                    <ToggleRow
                      label="Busca na web"
                      description="Permitir buscas automáticas"
                      value={settingsState.personalization.webSearch}
                      onChange={(v) => setSettingsState((s) => ({ ...s, personalization: { ...s.personalization, webSearch: v } }))}
                    />
                    <ToggleRow
                      label="Lousa"
                      description="Colaboração em textos e códigos"
                      value={settingsState.personalization.board}
                      onChange={(v) => setSettingsState((s) => ({ ...s, personalization: { ...s.personalization, board: v } }))}
                    />
                    <ToggleRow
                      label="Voz avançada"
                      description="Conversas mais naturais com voz"
                      value={settingsState.personalization.advancedVoice}
                      onChange={(v) => setSettingsState((s) => ({ ...s, personalization: { ...s.personalization, advancedVoice: v } }))}
                    />
                  </div>
                )}

                {activeSettingsTab === "apps" && (
                  <div className="space-y-3">
                    <SectionTitle title="Aplicativos" subtitle="Conectores habilitados" />
                    <IntegrationForm onAdd={addIntegration} loading={integrationsLoading} />
                    {integrationsError && (
                      <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                        {integrationsError}
                      </div>
                    )}
                    <div className="space-y-2">
                      {savedIntegrations.length === 0 ? (
                        <p className="text-xs text-slate-400">Nenhum item.</p>
                      ) : (
                        savedIntegrations.map((integration) => (
                          <div key={integration.name} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                            <div>
                              <p className="text-sm font-semibold text-white">{integration.name}</p>
                              <p className="text-xs text-slate-300">
                                {integration.domain ? `Domínio: ${integration.domain}` : integration.hasKey ? "Autorizado por API key" : "Sem credencial"}
                              </p>
                            </div>
                            <button onClick={() => removeIntegration(integration.name)} className="text-slate-300 hover:text-white">×</button>
                          </div>
                        ))
                      )}
                    </div>
                    <ToggleRow
                      label="Modo desenvolvedor"
                      description="Permitir conectores não verificados"
                      value={settingsState.apps.developerMode}
                      onChange={(v) => setSettingsState((s) => ({ ...s, apps: { ...s.apps, developerMode: v } }))}
                    />
                  </div>
                )}

                {activeSettingsTab === "schedules" && (
                  <div className="space-y-3">
                    <SectionTitle title="Agendamentos" subtitle="Execute rotinas futuras" />
                    <ToggleRow
                      label="Agendar tarefas"
                      description="Permitir que chats sejam re-executados"
                      value={settingsState.schedules.enabled}
                      onChange={(v) => setSettingsState((s) => ({ ...s, schedules: { ...s.schedules, enabled: v } }))}
                    />
                    <TextAreaRow
                      label="Descrição"
                      value={settingsState.schedules.note}
                      onChange={(v) => setSettingsState((s) => ({ ...s, schedules: { ...s.schedules, note: v } }))}
                      placeholder="Ex: Rodar auditoria toda segunda."
                    />
                  </div>
                )}

                {activeSettingsTab === "data" && (
                  <div className="space-y-3">
                    <SectionTitle title="Controlar dados" subtitle="Privacidade e exportação" />
                    <ToggleRow
                      label="Melhorar o modelo"
                      description="Permitir uso anônimo para melhoria"
                      value={settingsState.data.improveModel}
                      onChange={(v) => setSettingsState((s) => ({ ...s, data: { ...s.data, improveModel: v } }))}
                    />
                    <ToggleRow
                      label="Dados do navegador remoto"
                      description="Sincronizar dados do navegador"
                      value={settingsState.data.remoteData}
                      onChange={(v) => setSettingsState((s) => ({ ...s, data: { ...s.data, remoteData: v } }))}
                    />
                    <ToggleRow
                      label="Links compartilhados"
                      description="Permitir compartilhamento de chats"
                      value={settingsState.data.sharedLinks}
                      onChange={(v) => setSettingsState((s) => ({ ...s, data: { ...s.data, sharedLinks: v } }))}
                    />
                    <div className="flex flex-wrap gap-2 text-xs text-slate-200">
                      <button className="rounded-xl bg-white/10 px-3 py-2 font-semibold text-white hover:bg-white/15">Arquivar tudo</button>
                      <button className="rounded-xl border border-red-400/50 px-3 py-2 font-semibold text-red-200 hover:bg-red-400/10">Excluir tudo</button>
                      <button className="rounded-xl border border-white/20 px-3 py-2 font-semibold text-white hover:bg-white/10">Exportar</button>
                    </div>
                  </div>
                )}

                {activeSettingsTab === "security" && (
                  <div className="space-y-3">
                    <SectionTitle title="Segurança" subtitle="MFA e dispositivos" />
                    <ToggleRow
                      label="SMS"
                      description="Receber códigos por SMS/WhatsApp"
                      value={settingsState.security.mfaSms}
                      onChange={(v) => setSettingsState((s) => ({ ...s, security: { ...s.security, mfaSms: v } }))}
                    />
                    <ToggleRow
                      label="Aparelhos confiáveis"
                      description="Reconhecer dispositivos usados"
                      value={settingsState.security.trustedDevices}
                      onChange={(v) => setSettingsState((s) => ({ ...s, security: { ...s.security, trustedDevices: v } }))}
                    />
                    <div className="flex gap-2 text-xs text-slate-200">
                      <button
                        onClick={async () => {
                          try {
                            await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                            window.location.href = "/login";
                          } catch (err) {
                            setChatError(err instanceof Error ? err.message : "Erro ao sair deste aparelho");
                          }
                        }}
                        className="rounded-xl bg-white/10 px-3 py-2 font-semibold text-white hover:bg-white/15"
                      >
                        Sair deste aparelho
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/auth/logout", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              credentials: "include",
                              body: JSON.stringify({ all: true }),
                            });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) throw new Error(data.error || "Erro ao sair de tudo");
                            window.location.href = "/login";
                          } catch (err) {
                            setChatError(err instanceof Error ? err.message : "Erro ao sair de tudo");
                          }
                        }}
                        className="rounded-xl border border-white/20 px-3 py-2 font-semibold text-white hover:bg-white/10"
                      >
                        Sair de tudo
                      </button>
                    </div>
                  </div>
                )}

                {activeSettingsTab === "parental" && (
                  <div className="space-y-3">
                    <SectionTitle title="Controles parentais" subtitle="Gerencie membros da família" />
                    {familyError && (
                      <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                        {familyError}
                      </div>
                    )}
                    <TagList
                      items={settingsState.parental.members}
                      onRemove={(tag) => removeFamilyMember(tag)}
                    />
                    {familyLoading && <p className="text-xs text-slate-300">Sincronizando grupo familiar...</p>}
                    <InputActionRow
                      label="Adicionar membro"
                      placeholder="Nome ou e-mail"
                      actionLabel="Adicionar"
                      onSubmit={(val) => addFamilyMember(val)}
                    />
                  </div>
                )}

                {activeSettingsTab === "account" && (
                  <div className="space-y-3">
                    <SectionTitle title="Conta" subtitle="Plano, domínio e identidade" />
                    {accountLoading && <p className="text-xs text-slate-300">Carregando conta...</p>}
                    {accountError && (
                      <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                        {accountError}
                      </div>
                    )}
                    {domainsError && (
                      <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                        {domainsError}
                      </div>
                    )}
                    <InputRow
                      label="E-mail"
                      value={settingsState.account.email}
                      readOnly
                      placeholder="seu@email.com"
                    />
                    <InputRow
                      label="Plano"
                      value={settingsState.account.plan}
                      readOnly
                    />
                    <InputRow
                      label="Renovação"
                      value={
                        billingNotice.planExpired && billingNotice.expiredAt
                          ? `Expirado em ${new Date(billingNotice.expiredAt).toLocaleDateString("pt-BR")}`
                          : settingsState.account.renewal
                      }
                      readOnly
                      placeholder="Ex: 06/04/2026"
                    />
                    {billingNotice.planExpired && (
                      <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                        {billingNotice.reason === "manual_renewal_required"
                          ? `O plano ${billingNotice.expiredPlanName || "premium"} venceu e o ciclo pago por Pix foi encerrado. A conta foi revertida para o Free e precisa de um novo pagamento para renovar.`
                          : `O plano ${billingNotice.expiredPlanName || "premium"} venceu porque a renovacao automatica no cartao nao foi concluida. A conta foi revertida para o Free ate uma nova assinatura ser aprovada.`}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Link href="/plans" className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15">
                        Atualizar plano
                      </Link>
                    </div>
                    <TagList
                      items={settingsState.account.domains}
                      onRemove={(tag) => removeDomain(tag)}
                    />
                    {domainsLoading && <p className="text-xs text-slate-300">Salvando/carregando domínios...</p>}
                    <InputActionRow
                      label="Adicionar domínio"
                      placeholder="exemplo.com"
                      actionLabel="Salvar domínio"
                      onSubmit={(val) => addDomain(val.toLowerCase())}
                    />
                  </div>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">Conta, domínios e integrações são salvos no servidor. Preferências de UI seguem no dispositivo.</p>
          </div>
        </div>
      )}

    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: color }}>
      {label}
    </span>
  );
}

function Card({ title, icon: Icon, theme, children }: { title: string; icon: ElementType; theme: ThemePreset; children: ReactNode }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="rounded-3xl border border-white/10 p-4" style={{ background: theme.surface, borderColor: theme.wire }}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-5 w-5 text-cyan-200" />
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

function SettingChip({ icon: Icon, title, text }: { icon: ElementType; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
        <Icon className="h-5 w-5 text-cyan-200" />
      </div>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-300">{text}</p>
      </div>
    </div>
  );
}

function ToggleChip({ icon: Icon, label, active, disabled, onToggle }: { icon: ElementType; label: string; active: boolean; disabled?: boolean; onToggle: () => void | Promise<void> }) {
  return (
    <button
      onClick={() => !disabled && onToggle()}
      disabled={disabled}
      className={clsx(
        "flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition",
        active ? "border-emerald-300 bg-emerald-400/20 text-white" : "border-white/20 bg-white/5 text-slate-200",
        disabled ? "opacity-50 cursor-not-allowed" : "",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

async function recordOnce(): Promise<{ base64: string; mime: string } | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return null;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return new Promise((resolve, reject) => {
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onerror = (e) => reject(e.error);
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      stream.getTracks().forEach((t) => t.stop());
      resolve({ base64, mime: recorder.mimeType });
    };
    recorder.start();
    setTimeout(() => recorder.stop(), 3500); // up to 3.5s per utterance
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function downloadAsset(url: string, filename: string) {
  if (typeof document === "undefined") return;
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function getSpeakableResponse(content: string) {
  const media = parseMediaMessage(content);
  if (!media) return content;

  switch (media.kind) {
    case "image":
      return `Imagem gerada com sucesso. ${media.prompt}`;
    case "audio":
      return `Áudio gerado com sucesso. Texto: ${media.text}`;
    case "video":
      return `Vídeo gerado com sucesso. Prompt: ${media.prompt}`;
  }
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-white">{title}</p>
      {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}

function ToggleRow({ label, description, value, onChange }: { label: string; description?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        {description && <p className="text-xs text-slate-400">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={clsx(
          "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
          value ? "border-emerald-300 bg-emerald-400/20 text-white" : "border-white/20 bg-white/5 text-slate-200",
        )}
      >
        <div className={clsx("h-2 w-2 rounded-full", value ? "bg-emerald-300" : "bg-white/40")} />
        {value ? "Ligado" : "Desligado"}
      </button>
    </div>
  );
}

function SelectRow({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white focus:outline-none"
        >
          {options.map((opt) => (
            <option key={opt} value={opt} className="bg-slate-900 text-white">
              {opt}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function InputRow({ label, value, onChange, placeholder, onEnter, readOnly }: { label: string; value?: string; onChange?: (v: string) => void; placeholder?: string; onEnter?: (v: string) => void; readOnly?: boolean }) {
  return (
    <label className="block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
      <span className="font-semibold">{label}</span>
      <input
        value={value ?? ""}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly || !onChange}
        onKeyDown={(e) => {
          if (onEnter && e.key === "Enter") {
            e.preventDefault();
            const val = (e.target as HTMLInputElement).value.trim();
            if (val) {
              onEnter(val);
              (e.target as HTMLInputElement).value = "";
            }
          }
        }}
        className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
        placeholder={placeholder}
      />
    </label>
  );
}

function TextAreaRow({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
      <span className="font-semibold">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
        placeholder={placeholder}
      />
    </label>
  );
}

function MultiToggleRow({ label, options, values, onChange }: { label: string; options: string[]; values: string[]; onChange: (vals: string[]) => void }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
      <p className="font-semibold">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = values.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => {
                const next = active ? values.filter((v) => v !== opt) : [...values, opt];
                onChange(next);
              }}
              className={clsx(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                active ? "border-emerald-300 bg-emerald-400/20 text-white" : "border-white/20 bg-white/5 text-slate-200",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TagList({ items, onRemove }: { items: string[]; onRemove: (tag: string) => void }) {
  if (!items || items.length === 0) return <p className="text-xs text-slate-400">Nenhum item.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
          {item}
          <button onClick={() => onRemove(item)} className="text-slate-300 hover:text-white">×</button>
        </span>
      ))}
    </div>
  );
}

function InputActionRow({ label, placeholder, actionLabel, onSubmit }: { label: string; placeholder?: string; actionLabel: string; onSubmit: (value: string) => void | Promise<void> }) {
  const [value, setValue] = useState("");

  async function submit() {
    const cleaned = value.trim();
    if (!cleaned) return;
    await onSubmit(cleaned);
    setValue("");
  }

  return (
    <label className="block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
      <span className="font-semibold">{label}</span>
      <div className="mt-1 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
          placeholder={placeholder}
        />
        <button onClick={() => void submit()} type="button" className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20">
          {actionLabel}
        </button>
      </div>
    </label>
  );
}

function IntegrationForm({ onAdd, loading }: { onAdd: (name: string, apiKey?: string, domain?: string) => void; loading?: boolean }) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [domain, setDomain] = useState("");
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white">
      <p className="font-semibold">Adicionar integração</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome da integração (ex: GitHub)"
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
      />
      <input
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="API key ou token (opcional se usar domínio)"
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
      />
      <input
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="Domínio permitido (opcional se usar API key)"
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
      />
      <button
        onClick={() => {
          if (!name.trim() || (!key.trim() && !domain.trim())) return;
          onAdd(name.trim(), key.trim(), domain.trim());
          setName("");
          setKey("");
          setDomain("");
        }}
        disabled={loading}
        className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Conectar"}
      </button>
    </div>
  );
}

function MessageBubble({ role, content, accent, onOpenMedia }: { role: "user" | "assistant"; content: string; accent: string; onOpenMedia: (viewer: MediaViewerState) => void }) {
  const isUser = role === "user";
  const mediaPayload = !isUser ? parseMediaMessage(content) : null;
  const hiddenEncodedPayload = !isUser && !mediaPayload && isEncodedMediaMessage(content);

  return (
    <div className={clsx("flex", isUser ? "justify-end" : "justify-start")}> 
      <div
        className={clsx(
          "max-w-2xl rounded-2xl border px-4 py-3 text-sm shadow", 
          isUser ? "bg-white/10 text-white" : "bg-slate-900/70 text-slate-100 border-white/5",
        )}
        style={!isUser ? { borderColor: accent } : undefined}
      >
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{isUser ? "Você" : "HYDRA AI"}</p>
        {mediaPayload?.kind === "image" ? (
          <div className="mt-2 space-y-3">
            <img src={mediaPayload.url} alt={mediaPayload.prompt} className="max-h-80 w-full rounded-2xl object-cover" />
            <div>
              <p className="text-sm font-semibold text-white">Imagem gerada</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{mediaPayload.prompt}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => downloadAsset(mediaPayload.url, "hydra-image.png")} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15">
                Baixar
              </button>
              <button
                onClick={() => onOpenMedia({ kind: "image", url: mediaPayload.url, title: "Imagem gerada", subtitle: mediaPayload.prompt })}
                className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                Abrir
              </button>
            </div>
          </div>
        ) : mediaPayload?.kind === "audio" ? (
          <div className="mt-2 space-y-3">
            <div>
              <p className="text-sm font-semibold text-white">Áudio gerado</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{mediaPayload.text}</p>
            </div>
            <audio controls className="w-full" src={mediaPayload.audioUrl} preload="metadata" />
            <div className="flex gap-2">
              <button onClick={() => downloadAsset(mediaPayload.audioUrl, "hydra-audio.mp3")} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15">
                Baixar
              </button>
            </div>
          </div>
        ) : mediaPayload?.kind === "video" ? (
          <div className="mt-2 space-y-3">
            <div>
              <p className="text-sm font-semibold text-white">Vídeo gerado</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{mediaPayload.prompt}</p>
            </div>
            <video controls playsInline className="max-h-96 w-full rounded-2xl bg-black/40" src={mediaPayload.url} preload="metadata" />
            <div className="flex gap-2">
              <button onClick={() => downloadAsset(mediaPayload.url, "hydra-video.mp4")} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15">
                Baixar
              </button>
              <button
                onClick={() => onOpenMedia({ kind: "video", url: mediaPayload.url, title: "Vídeo gerado", subtitle: mediaPayload.prompt })}
                className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                Abrir
              </button>
            </div>
          </div>
        ) : hiddenEncodedPayload ? (
          <p className="text-sm leading-relaxed text-slate-300">Conteúdo multimídia gerado.</p>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        )}
      </div>
    </div>
  );
}

function MediaViewerModal({ viewer, onClose, onDownload }: { viewer: Exclude<MediaViewerState, null>; onClose: () => void; onDownload: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-5xl rounded-3xl border border-white/10 bg-[#08111f] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{viewer.title}</p>
            {viewer.subtitle && <p className="mt-1 text-sm text-slate-300">{viewer.subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onDownload} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15">
              Baixar
            </button>
            <button onClick={onClose} className="rounded-xl border border-white/15 p-2 text-white hover:bg-white/10" aria-label="Fechar visualização">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex max-h-[78vh] min-h-[360px] items-center justify-center overflow-hidden rounded-2xl bg-black/40">
          {viewer.kind === "image" ? (
            <img src={viewer.url} alt={viewer.title} className="max-h-[78vh] w-full object-contain" />
          ) : (
            <video controls playsInline autoPlay className="max-h-[78vh] w-full bg-black object-contain" src={viewer.url} preload="metadata" />
          )}
        </div>
      </div>
    </div>
  );
}

function PreferenceToggle({ title, description, value, onChange }: { title: string; description: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-300">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={clsx(
          "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
          value ? "border-emerald-300 bg-emerald-400/20 text-white" : "border-white/20 bg-white/5 text-slate-200",
        )}
      >
        <div className={clsx("h-2 w-2 rounded-full", value ? "bg-emerald-300" : "bg-white/40")} />
        {value ? "Ligado" : "Desligado"}
      </button>
    </div>
  );
}
