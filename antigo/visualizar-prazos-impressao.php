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
  } elseif(isset($_GET['id'])) {
    $id = $conexao->real_escape_string($_GET['id']);
  } else {
    redireciona(URL_SISTEMA);
  }
?>
<!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8">
  <? if(isset($_GET['data'])) { ?>
  <title>Impressão dos prazos de <?=formataDataBr($data);?> | Intranet Coelho Vignini</title>
  <? } else { ?>
  <title>Impressão do prazo | Intranet Coelho Vignini</title>
  <? } ?>
  <style type="text/css">
    body { font-size:12px; font-family:Arial; }
  </style>
</head>
<body class="fixed-left">
  <? if(isset($_GET['data'])) { ?>
  <h1 class="text-center" style="text-align:center;"><?=formataDataBr($data);?></h1>
  <br/>
  <? } ?>
  <div id="prazos">
    <?
      if(isset($_GET['data'])) {
        $where = "p.data='".$data."'";
      } elseif(isset($_GET['id'])) {
        $where = "p.id='".$_GET['id']."'";
      }
      if(isset($_GET['tipo'])) {
        if($_GET['tipo'] == "administrativo") {
          $where .= " AND p.tipo='administrativo'";
        } elseif($_GET['tipo'] == "trabalhista") {
          $where .= " AND p.tipo='trabalhista'";
        } elseif($_GET['tipo'] == "civel") {
          $where .= " AND p.tipo='civil'";
        }
      }
      $prazos = $conexao->query("SELECT p.*, CONCAT(u.nome, ' ', u.sobrenome) as usuario FROM prazos p LEFT JOIN usuarios u ON p.status=u.id WHERE ".$where." ORDER BY FIELD(tipo,'administrativo','civil','trabalhista')");
      if($prazos && $prazos->num_rows > 0) {
        while($dadosP = $prazos->fetch_array()) {
          $classe = "";

          if($dadosP['tipo'] == 'administrativo') { $classe = "green-1"; $tpPrazo = " - Prazo Administrativo"; }
          elseif($dadosP['tipo'] == 'trabalhista') { $classe = "azul-1"; $tpPrazo = " - Prazo Trabalhista"; }
          elseif($dadosP['tipo'] == 'civil') { $classe = "darkblue-2"; $tpPrazo = " - Prazo Cível"; }

          if($dadosP['status'] != 0) { 
            $classe = "red-1 cumprido"; 
            $cumprido = " - Prazo cumprido por ".$dadosP['usuario']." em ".formataDataHoraBr($dadosP['datahoracumprido']);
          } else { 
            $classe .= " nao-cumprido"; 
            $cumprido = " - Prazo não cumprido"; 
          }

          $advogados = $idAdvogados = array();
          $prazosUsu = $conexao->query("SELECT u.id, u.nome, u.sobrenome FROM prazosUsuarios pu INNER JOIN usuarios u ON pu.idUsuario=u.id WHERE pu.idPrazo='".$dadosP['id']."'");
          while($dadosPU = $prazosUsu->fetch_array(MYSQLI_ASSOC)) {
            $id               = $dadosPU['id'];

            $idAdvogados[$id] = $id;
            $advogados[]      = $dadosPU['nome']." ".$dadosPU['sobrenome'];
          }
          if(in_array($_SESSION['cod'], $idAdvogados)) { $classe .= " meu-prazo"; }
          $advogados = implode(", ", $advogados);
    ?>
    <div class="col-xs-12 mix no-padding <?=$classe." ".$dadosP['tipo'];?>">
      <div class="widget <?=$classe." ".$dadosP['tipo'];?>">
        <div class="widget-header">
          <h4><strong><?=$dadosP['prazo'];?> - <?=formataDataBr($data);?><?=$cumprido;?><?=$tpPrazo;?></strong></h4>
        </div>
        <div class="widget-content padding">
          <? if(!empty($advogados) && strlen($advogados) > 0) { ?>
          <p><strong>Advogados:</strong><br/><?=$advogados;?></p>
          <? } ?>
          <? if(!empty($dadosP['observacao']) && strlen($dadosP['observacao']) > 0) { ?>
          <p><strong>Observação:</strong><br/><?=nl2br(trim($dadosP['observacao']));?></p>
          <? } ?>
          <? if(!empty($dadosP['conteudo']) && strlen($dadosP['conteudo']) > 0) { ?>
          <p><strong>Descrição:</strong><br/><?=nl2br(trim($dadosP['conteudo']));?></p>
          <? } ?>
        </div>
      </div>
    </div>
    <hr/>
    <?
        }
      } else {
    ?>
    <p style="text-align:center;">Nenhum prazo cadastrado para esta data!</p>
    <? } ?>
  </div>
</body>
</html>