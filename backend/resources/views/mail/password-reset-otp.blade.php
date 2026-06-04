<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>Code de réinitialisation</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0">
        <tr>
          <td style="background:linear-gradient(135deg,#059669,#047857);padding:24px 28px;color:#fff">
            <div style="font-size:18px;font-weight:600">Plateforme Tambours</div>
            <div style="font-size:13px;opacity:.85;margin-top:2px">Réinitialisation du mot de passe</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px">
            <p style="margin:0 0 14px;font-size:15px">Bonjour {{ $firstName }},</p>
            <p style="margin:0 0 18px;font-size:14px;color:#475569;line-height:1.6">
              Vous avez demandé la réinitialisation de votre mot de passe. Utilisez le code ci-dessous pour continuer&nbsp;:
            </p>

            <div style="text-align:center;margin:18px 0 22px">
              <span style="display:inline-block;font-size:30px;letter-spacing:8px;font-weight:700;color:#047857;background:#ecfdf5;border:1px solid #a7f3d0;padding:14px 22px;border-radius:10px;font-family:Consolas,monospace">
                {{ $otp }}
              </span>
            </div>

            <p style="margin:0 0 10px;font-size:13px;color:#64748b">
              Ce code expire dans <strong>{{ $expiresInMinutes }} minutes</strong>.
            </p>
            <p style="margin:0;font-size:13px;color:#64748b">
              Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe restera inchangé.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f1f5f9;padding:14px 28px;font-size:12px;color:#64748b;text-align:center">
            Message automatique — merci de ne pas répondre.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
