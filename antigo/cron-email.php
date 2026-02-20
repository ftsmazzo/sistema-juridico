<? 
  include_once("include/configuracoes.php");
  include_once("include/funcoes.php");
  include_once("include/seguranca.php");
  include_once("include/PHPMailer/PHPMailerAutoload.php");

  $conexao = new mysqli(SERVIDOR, USUARIO, SENHA, BANCO);
  if($conexao->connect_error) {
    die("Connect Error (".$conexao->connect_errno.")".$conexao->connect_error);
  }
  $conexao->query("SET CHARACTER SET utf8");
  $conexao->query("SET NAMES 'utf8'");

  $mail = new PHPMailer;
  $mail->CharSet = 'UTF-8';

  $mail->isSMTP();
  $mail->SMTPAuth = true;
  $mail->Host = MailHost;
  $mail->Port = MailPort;
  $mail->Username = MailUsername;
  $mail->Password = MailPassword;

  $mail->From = MailUsername;
  $mail->FromName = (MailName);

  $tipos = array("administrativo" => "Administrativo", "civil" => "Cível", "trabalhista" => "Trabalhista");

  $data = date("Y-m-d");

  $usuarios = $conexao->query("SELECT * FROM usuarios WHERE ativo=1 ORDER BY nome");
  while($dadosU = $usuarios->fetch_array(MYSQLI_ASSOC)) {
    $enviaEmail = false;

    $email = "
Olá, ".$dadosU['nome']." ".$dadosU['sobrenome'].".

Este é um e-mail informativo com as suas audiências e os prazos para cumprir.
Por favor não responda este e-mail.
";

    // Audiências
    $audiencias = $conexao->query("SELECT * FROM audienciasUsuarios AU INNER JOIN audiencias A ON A.id=AU.idAudiencia WHERE AU.idUsuario='".$dadosU['id']."' AND DATE(A.DATAHORA) = '".$data."' GROUP BY A.id");
    if($audiencias && $audiencias->num_rows > 0) {
      $email .= "
Audiências (".$audiencias->num_rows."):
";
      while($dadosA = $audiencias->fetch_array(MYSQLI_ASSOC)) {
        $email .= "
--------------------------------------------------
Num. Processo: ".$dadosA['numprocesso']."
Vara:          ".$dadosA['vara']."
Local:         ".$dadosA['local']."
Reclamante:    ".$dadosA['reclamante']."
Reclamado:     ".$dadosA['reclamado']."
Preposto:      ".$dadosA['preposto']."
Data e hora:   ".$dadosA['datahora']."

Observacao:    
".$dadosA['observacao']."
--------------------------------------------------
";
      }
      $enviaEmail = true;
    }

    // Prazos
    $prazos = $conexao->query("SELECT P.*, CONCAT(u.nome, ' ', u.sobrenome) as usuario FROM prazosUsuarios PU INNER JOIN prazos P ON P.id=PU.idPrazo LEFT JOIN usuarios U ON P.status=U.id WHERE PU.idUsuario='".$dadosU['id']."' AND P.DATA='".$data."' GROUP BY P.id");
    if($prazos && $prazos->num_rows > 0) {
      $email .= "

Prazos (".$prazos->num_rows."):
";
      while($dadosP = $prazos->fetch_array(MYSQLI_ASSOC)) {
        if($dadosP['status'] != 0) { 
          $status = "Cumprido por ".$dadosP['usuario']." em ".formataDataHoraBr($dadosP['datahoracumprido']);
        } else { 
          $status = "Não cumprido";
        }

        $email .= "
--------------------------------------------------
Tipo:   ".$tipos[$dadosP['tipo']]."
Data:   ".$dadosP['data']."
Prazo:  ".$dadosP['prazo']."
Status: ".$status."

Conteúdo:
".$dadosP['conteudo']."
--------------------------------------------------
";
      }
      $enviaEmail = true;
    }

    $email .= "

Este e-mail foi gerado automaticamente pelo sistema em ".date("d/m/Y H:i:s").".";

    if($enviaEmail && $dadosU['email'] != "") {
      $mail->addAddress($dadosU['email']);
      $mail->Subject = "Prazos e Audiências para ".date("d/m/Y")." - Agenda Coelho Vignini";
      $mail->Body    = $email;
      $mail->IsHTML(false);

      $mail->send();
      $mail->ClearAllRecipients();
      // echo $dadosU['email']." ".$email;
    }
  }