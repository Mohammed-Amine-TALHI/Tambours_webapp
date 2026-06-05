import { useState } from 'react'

/**
 * Displays a one-time temporary password to the admin.
 * The password is shown ONCE and cannot be retrieved afterwards.
 * Includes a printable credential slip to hand to the operator.
 */
export default function TempPasswordModal({ open, onClose, user, password }) {
  const [copied, setCopied] = useState(false)
  if (!open) return null

  const fullName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()

  async function copy() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {/* ignore */}
  }

  function printSlip() {
    const origin = window.location.origin
    const dateStr = new Date().toLocaleString('fr-FR')
    const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Identifiants — ${esc(fullName)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:ui-sans-serif,system-ui,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;margin:0;padding:32px}
  .sheet{max-width:560px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden}
  .head{background:#059669;color:#fff;padding:20px 24px;display:flex;align-items:center;gap:14px}
  .head img{height:44px;width:auto;background:#fff;border-radius:10px;padding:4px}
  .head h1{font-size:18px;margin:0}
  .head p{font-size:13px;margin:2px 0 0;opacity:.9}
  .body{padding:24px}
  .row{padding:10px 0;border-bottom:1px solid #f1f5f9}
  .label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;margin-bottom:2px}
  .value{font-size:15px}
  .mono{font-family:ui-monospace,Consolas,Menlo,monospace}
  .pw{margin-top:16px}
  .pw .box{font-family:ui-monospace,Consolas,monospace;font-size:22px;letter-spacing:.04em;background:#f8fafc;border:1px dashed #94a3b8;border-radius:10px;padding:12px 16px;text-align:center;user-select:all}
  .note{margin-top:18px;font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px}
  .foot{margin-top:16px;font-size:11px;color:#94a3b8;text-align:center}
  @media print{body{padding:0}.sheet{border:0;border-radius:0}}
</style>
</head>
<body onload="window.print()">
  <div class="sheet">
    <div class="head">
      <img src="${origin}/ocp-logo.png" alt="OCP">
      <div><h1>Plateforme Tambours</h1><p>Identifiants de connexion</p></div>
    </div>
    <div class="body">
      <div class="row"><div class="label">Nom</div><div class="value">${esc(fullName)}</div></div>
      <div class="row"><div class="label">Nom d'utilisateur</div><div class="value mono">${esc(user?.username)}</div></div>
      <div class="row"><div class="label">Email</div><div class="value mono">${esc(user?.email)}</div></div>
      <div class="pw">
        <div class="label">Mot de passe temporaire</div>
        <div class="box">${esc(password)}</div>
      </div>
      <div class="note">⚠ Ce mot de passe est temporaire. Vous devrez le changer lors de votre première connexion.</div>
      <div class="foot">Adresse de connexion : ${esc(origin)}/login &middot; Fiche générée le ${esc(dateStr)}</div>
    </div>
  </div>
</body>
</html>`

    const win = window.open('', '_blank', 'width=720,height=820')
    if (!win) {
      alert('Veuillez autoriser les fenêtres pop-up pour imprimer la fiche.')
      return
    }
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-emerald-600 text-white px-6 py-4">
          <h3 className="font-semibold">Mot de passe temporaire généré</h3>
          <p className="text-sm text-emerald-50/90 mt-0.5">
            Communiquez ces identifiants à <strong>{fullName}</strong> — le mot de passe ne sera plus affiché.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Identity */}
          <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
            <div className="px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Nom</p>
              <p className="text-slate-800">{fullName}</p>
            </div>
            <div className="px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Nom d'utilisateur</p>
              <p className="font-mono text-slate-800">{user?.username}</p>
            </div>
            <div className="px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
              <p className="font-mono text-slate-800 break-all">{user?.email}</p>
            </div>
          </div>

          {/* Password */}
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Mot de passe (unique)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-lg bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 select-all break-all">
                {password}
              </code>
              <button
                onClick={copy}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 shrink-0"
              >
                {copied ? 'Copié ✓' : 'Copier'}
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">
            ⚠ L'utilisateur devra le changer dès sa première connexion.
            Ce mot de passe ne sera <strong>plus jamais</strong> affiché.
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={printSlip}
              className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
            >
              🖨 Imprimer la fiche
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg py-2.5"
            >
              J'ai noté le mot de passe
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Escape values interpolated into the printable HTML document. */
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}
