import { LoginForm } from "./LoginForm";
import { LogoIcon, Wordmark } from "@/components/Logo";
export default function LoginPage() {
  const demo = (process.env.SEED_DEMO ?? "true") === "true";
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-2"><LogoIcon size={52} /><Wordmark size="text-4xl" /></div>
        <p className="text-center text-gris mb-6">Cada servicio deja huella</p>
        <div className="card p-6"><h1 className="text-lg font-bold mb-4">Ingresar al taller</h1><LoginForm /></div>
        {demo && <div className="mt-4 text-xs text-gris card p-3 leading-relaxed"><b>Cuentas de demostración</b> (contraseña <code>bitaller123</code>):<br />Dueño: nicolas@bitaller.co · Mecánico: andres@bitaller.co</div>}
      </div>
    </main>
  );
}
