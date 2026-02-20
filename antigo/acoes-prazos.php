<?
  include_once("include/configuracoes.php");
  include_once("include/funcoes.php");
  include_once("include/seguranca.php");

  $conexao = new mysqli(SERVIDOR, USUARIO, SENHA, BANCO);
  if($conexao->connect_error) {
    die("Connect Error (".$conexao->connect_errno.")".$conexao->connect_error);
  }
  $conexao->query("SET CHARACTER SET utf8");
  $conexao->query("SET NAMES 'utf8'");

  $seguranca = new seguranca;
  $seguranca->verificarLogin();

  if(isset($_POST['id']) && !empty($_POST['id'])) {
  	$id = $conexao->real_escape_string($_POST['id']);
  } else {
  	die("erro-id");
  }

  if(isset($_POST['acao']) && $_POST['acao'] == "cumprir") {
  	$sqlCumprir = $conexao->query("UPDATE prazos SET status='".$_SESSION['cod']."', data_cumprido=CURDATE(), datahoracumprido=NOW() WHERE id='".$id."'");
  	if($sqlCumprir && $conexao->affected_rows > 0) {
  		die("ok");
  	} else {
  		die("erro");
  	}
  } elseif(isset($_POST['acao']) && $_POST['acao'] == "descumprir") {
  	$seguranca->verificarGrupo('admin');

  	$sqlDescumprir = $conexao->query("UPDATE prazos SET status='0' WHERE id='".$id."'");
  	if($sqlDescumprir && $conexao->affected_rows > 0) {
  		die("ok");
  	} else {
  		die("erro");
  	}
  } elseif(isset($_POST['acao']) && $_POST['acao'] == "excluir") {
  	$seguranca->verificarGrupo('admin');

  	$sqlExcluir = $conexao->query("DELETE FROM prazos WHERE id='".$id."'");
  	if($sqlExcluir && $conexao->affected_rows > 0) {
  		die("ok");
  	} else {
  		die("erro");
  	}
  } else {
  	die("erro-acao");
  }

?>