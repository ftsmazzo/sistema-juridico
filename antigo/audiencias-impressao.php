<? 
  include_once("include/configuracoes.php");
  include_once("include/funcoes.php");
  include_once("include/seguranca.php");

  $data = isset($_GET['data'])?$_GET['data']:"";

  $conexao = new mysqli(SERVIDOR, USUARIO, SENHA, BANCO);
  if($conexao->connect_error) {
    die("Connect Error (".$conexao->connect_errno.")".$conexao->connect_error);
  }
  $conexao->query("SET CHARACTER SET utf8");
  $conexao->query("SET NAMES 'utf8'");

  $seguranca = new seguranca;
  $seguranca->verificarLogin();

  if(isset($_GET['data']) && !empty($_GET['data']) && dataValida($_GET['data'])) {
    $data = $conexao->real_escape_string($_GET['data']);
  } else {
    redireciona(URL_SISTEMA);
  }

  $dataPHP = new DateTime($data);
  $domingo = $dataPHP->modify('this week -1 days')->format("d/m/Y");
  $sabado = $dataPHP->modify('this week +5 days')->format("d/m/Y");
?>
<!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8">
  <title>Impressão das audiências da semana <?=$domingo;?> até <?=$sabado;?> | Intranet Coelho Vignini</title>
</head>
<body class="fixed-left">
  <h1 class="text-center" style="text-align:center;">Audiências da semana de <?=$domingo;?> até <?=$sabado;?></h1>
  <br/>
  <div id="prazos">
    <?
        $audiencias = $conexao->query("SELECT * FROM audiencias WHERE WEEK(datahora)=WEEK('".$data."') AND YEAR(datahora)=YEAR('".$data."')");
        if($audiencias && $audiencias->num_rows > 0) {
          while($dadosA = $audiencias->fetch_array(MYSQLI_ASSOC)) {
            $titulo = "Número do processo ".$dadosA['numprocesso'];

            $advogados = $idAdvogados = array();
            $audienciaUsu = $conexao->query("SELECT u.id, u.nome, u.sobrenome FROM audienciasUsuarios au INNER JOIN usuarios u ON au.idUsuario=u.id WHERE au.idAudiencia='".$dadosA['id']."'");
            while($dadosAU = $audienciaUsu->fetch_array(MYSQLI_ASSOC)) {
              $id               = $dadosAU['id'];

              $idAdvogados[$id] = $id;
              $advogados[]      = $dadosAU['nome']." ".$dadosAU['sobrenome'];
            }
            if(in_array($_SESSION['cod'], $idAdvogados)) { $classe = "minha-audiencia"; } else { $classe = ""; }
            $advogados = implode(", ", $advogados);
    ?>
    <div class="col-xs-6 mix no-padding <?=$classe." ".$dadosP['tipo'];?>">
      <div class="widget <?=$classe." ".$dadosP['tipo'];?>">
        <div class="widget-header">
          <h4><strong><?=$titulo;?> - <?=formataDataHoraBr($dadosA["datahora"]);?></strong></h4>
        </div>
        <div class="widget-content padding">
          <p>
          <strong>Processo:</strong> <?=trim($dadosA["numprocesso"]);?><br/>
          <strong>Partes:</strong> <?=trim($dadosA["reclamado"]);?> X <?=trim($dadosA["reclamante"]);?><br/>
          <strong>Audiência:</strong> <?=formataDataHoraBr(trim($dadosA["datahora"]));?><br/>
          <strong>Preposto:</strong> <?=trim($dadosA["preposto"]);?><br/>
          </p>
        </div>
      </div>
    </div>
    <hr/>
    <?
        }
      } else {
    ?>
    <p style="text-align:center;">Nenhuma audiência cadastrada para esta semana!</p>
    <? } ?>
  </div>
</body>
</html>