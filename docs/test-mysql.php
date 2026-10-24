<?php
/**
 * GSPME - Test des identifiants MySQL avec PHP (indépendant de Node).
 * 1) Envoyez ce fichier dans public_html  2) ouvrez-le dans le navigateur  3) saisissez les identifiants
 * 4) SUPPRIMEZ-LE IMMÉDIATEMENT après le test (il ne doit pas rester en ligne).
 * Rien n'est enregistré : les valeurs ne servent qu'à tenter la connexion.
 */
header('Content-Type: text/html; charset=utf-8');
function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
$result = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    mysqli_report(MYSQLI_REPORT_OFF);
    $host = trim($_POST['host'] ?? 'localhost');
    $user = trim($_POST['user'] ?? '');
    $pass = (string)($_POST['pass'] ?? '');
    $db   = trim($_POST['db'] ?? '');
    $c = @new mysqli($host, $user, $pass, $db);
    if ($c->connect_errno) {
        $result = ['ok' => false, 'msg' => "Échec : [{$c->connect_errno}] {$c->connect_error}"];
    } else {
        $tables = [];
        if ($r = $c->query('SHOW TABLES')) { while ($row = $r->fetch_row()) { $tables[] = $row[0]; } }
        $result = ['ok' => true, 'msg' => 'Connexion RÉUSSIE avec PHP (serveur ' . $c->server_info . ', mode : ' . $c->host_info . ').', 'tables' => $tables];
        $c->close();
    }
}
?><!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Test MySQL</title>
<style>body{font-family:system-ui,sans-serif;max-width:520px;margin:30px auto;padding:0 16px}input{width:100%;padding:9px;margin:4px 0 12px;box-sizing:border-box}
button{padding:10px 18px;background:#0F5132;color:#fff;border:0;border-radius:6px;cursor:pointer}.ok{background:#e7f6ee;padding:12px;border-radius:6px}.ko{background:#fde8e8;padding:12px;border-radius:6px}</style></head><body>
<h2>Test de connexion MySQL</h2>
<p><strong>Supprimez ce fichier après le test.</strong></p>
<form method="post" autocomplete="off">
  <label>Hôte</label><input name="host" value="<?= h($_POST['host'] ?? 'localhost') ?>">
  <label>Utilisateur (avec le préfixe cPanel)</label><input name="user" value="<?= h($_POST['user'] ?? '') ?>">
  <label>Mot de passe</label><input name="pass" type="password">
  <label>Base de données</label><input name="db" value="<?= h($_POST['db'] ?? '') ?>">
  <button type="submit">Tester</button>
</form>
<?php if ($result): ?>
  <div class="<?= $result['ok'] ? 'ok' : 'ko' ?>"><p><?= h($result['msg']) ?></p>
  <?php if ($result['ok']): ?><p>Tables : <?= $result['tables'] ? h(implode(', ', $result['tables'])) : 'aucune (base vide : normal avant le premier démarrage)' ?></p><?php endif; ?></div>
<?php endif; ?>
</body></html>
