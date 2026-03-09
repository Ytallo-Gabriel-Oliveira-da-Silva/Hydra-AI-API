"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Mic, RefreshCw, ShieldCheck, Volume2 } from "lucide-react";

type DeviceInfoState = {
  microphones: MediaDeviceInfo[];
  cameras: MediaDeviceInfo[];
};

export default function MediaDiagnosticsPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<DeviceInfoState>({ microphones: [], cameras: [] });
  const [permissions, setPermissions] = useState({ microphone: "unknown", camera: "unknown" });
  const [error, setError] = useState<string | null>(null);
  const [testingMic, setTestingMic] = useState(false);
  const [testingCam, setTestingCam] = useState(false);
  const [speechReady, setSpeechReady] = useState(false);

  useEffect(() => {
    setSpeechReady(typeof window !== "undefined" && "speechSynthesis" in window);
    void loadDevices();
    void loadPermissions();

    return () => {
      stopPreview();
    };
  }, []);

  async function loadPermissions() {
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    try {
      const mic = await navigator.permissions.query({ name: "microphone" as PermissionName });
      const cam = await navigator.permissions.query({ name: "camera" as PermissionName });
      setPermissions({ microphone: mic.state, camera: cam.state });
    } catch {
      setPermissions({ microphone: "unsupported", camera: "unsupported" });
    }
  }

  async function loadDevices() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        microphones: all.filter((device) => device.kind === "audioinput"),
        cameras: all.filter((device) => device.kind === "videoinput"),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao listar dispositivos");
    }
  }

  function stopPreview() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function testMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) return;
    setTestingMic(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      await loadPermissions();
      await loadDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao acessar microfone");
    } finally {
      setTestingMic(false);
    }
  }

  async function testCamera() {
    if (!navigator.mediaDevices?.getUserMedia) return;
    setTestingCam(true);
    setError(null);
    try {
      stopPreview();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      await loadPermissions();
      await loadDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao acessar câmera");
    } finally {
      setTestingCam(false);
    }
  }

  function testSpeech() {
    if (!speechReady) {
      setError("speechSynthesis não está disponível neste navegador");
      return;
    }
    setError(null);
    const utterance = new SpeechSynthesisUtterance("Teste de voz da plataforma HYDRA concluído.");
    utterance.lang = "pt-BR";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#030712_0%,#08111f_55%,#02050b_100%)] px-6 py-12 text-slate-50">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-200">Diagnóstico</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Câmera, microfone e voz local</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Esta tela valida se o navegador consegue detectar dispositivos, solicitar permissões e reproduzir voz local.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { void loadPermissions(); void loadDevices(); }} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
              <RefreshCw className="mr-2 inline h-4 w-4" /> Atualizar
            </button>
            <Link href="/dashboard" className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15">
              Voltar
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-xl">
            <p className="text-sm font-semibold text-white">Status do navegador</p>
            <div className="mt-4 space-y-3 text-sm text-slate-200">
              <StatusRow icon={Mic} label="Permissão de microfone" value={permissions.microphone} />
              <StatusRow icon={Camera} label="Permissão de câmera" value={permissions.camera} />
              <StatusRow icon={Volume2} label="Voz local" value={speechReady ? "available" : "unavailable"} />
            </div>

            <div className="mt-6 grid gap-3">
              <button onClick={() => void testMicrophone()} disabled={testingMic} className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60">
                <Mic className="mr-2 inline h-4 w-4" /> {testingMic ? "Testando microfone..." : "Testar microfone"}
              </button>
              <button onClick={() => void testCamera()} disabled={testingCam} className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-400 disabled:opacity-60">
                <Camera className="mr-2 inline h-4 w-4" /> {testingCam ? "Testando câmera..." : "Testar câmera"}
              </button>
              <button onClick={testSpeech} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                <Volume2 className="mr-2 inline h-4 w-4" /> Testar voz local
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-xl">
            <p className="text-sm font-semibold text-white">Dispositivos detectados</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <DeviceList title="Microfones" devices={devices.microphones} />
              <DeviceList title="Câmeras" devices={devices.cameras} />
            </div>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-white"><ShieldCheck className="h-4 w-4 text-cyan-300" /> Pré-visualização da câmera</p>
              <video ref={videoRef} muted playsInline className="mt-4 aspect-video w-full rounded-2xl bg-slate-950 object-cover" />
              <div className="mt-4 flex gap-3">
                <button onClick={stopPreview} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  Encerrar preview
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ icon: Icon, label, value }: { icon: typeof Mic; label: string; value: string }) {
  const normalized = value.toLowerCase();
  const tone = normalized === "granted" || normalized === "available"
    ? "text-emerald-200 border-emerald-400/30 bg-emerald-400/10"
    : normalized === "prompt"
      ? "text-amber-100 border-amber-400/30 bg-amber-400/10"
      : "text-slate-200 border-white/10 bg-white/5";

  return (
    <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${tone}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <span className="text-xs font-semibold uppercase tracking-wide">{value}</span>
    </div>
  );
}

function DeviceList({ title, devices }: { title: string; devices: MediaDeviceInfo[] }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-3 space-y-2 text-sm text-slate-300">
        {devices.length === 0 ? (
          <p>Nenhum dispositivo detectado.</p>
        ) : (
          devices.map((device, index) => (
            <div key={`${device.deviceId}-${index}`} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              {device.label || `${title.slice(0, -1)} ${index + 1}`}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
