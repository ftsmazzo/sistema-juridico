<? 
  include_once("include/configuracoes.php");
  include_once("include/funcoes.php");
  include_once("include/seguranca.php");

  if(isset($_GET['id'])) { $title = "Editar Prazo"; } else { $title = "Cadastrar novo Prazo"; }
  include_once("include/header.php");

  $conexao = new mysqli(SERVIDOR, USUARIO, SENHA, BANCO);
  if($conexao->connect_error) {
    die("Connect Error (".$conexao->connect_errno.")".$conexao->connect_error);
  }
  $conexao->query("SET CHARACTER SET utf8");
  $conexao->query("SET NAMES 'utf8'");

  $seguranca = new seguranca;
  $seguranca->verificarLogin();
  $seguranca->verificarGrupo('admin');

  if(isset($_GET['id'])) {
    $id = $conexao->real_escape_string($_GET['id']);

    if(isset($_POST['submitPrazo'])) {
      $tipo             = $conexao->real_escape_string($_POST['tipo']);
      $data             = formataDataSQL($conexao->real_escape_string($_POST['data']));
      $observacao       = $conexao->real_escape_string($_POST['observacao']);
      $conteudo         = $conexao->real_escape_string($_POST['conteudo']);
      $prazo            = $conexao->real_escape_string($_POST['prazo']);
      $status           = $conexao->real_escape_string($_POST['status']);
      $datahoracumprido = formataDataHoraSQL($conexao->real_escape_string($_POST['datahoracumprido']));

      $sqlPrazo = $conexao->query("UPDATE prazos SET tipo='".$tipo."', data='".$data."', observacao='".$observacao."', conteudo='".$conteudo."', prazo='".$prazo."', status='".$status."', dataHoraCumprido='".$datahoracumprido."' WHERE id='".$id."'");
      if($sqlPrazo) {
        if(isset($_POST['advogados']) && count($_POST['advogados']) > 0) {
          foreach($_POST['advogados'] as $chave => $valor) {
            $idUsuario = $conexao->real_escape_string($valor);
            $verfPU = $conexao->query("SELECT * FROM prazosUsuarios WHERE idPrazo='".$id."' AND idUsuario='".$idUsuario."'");
            if($verfPU && $verfPU->num_rows == 0) {
              $conexao->query("INSERT INTO prazosUsuarios (idPrazo, idUsuario) VALUES ('".$id."', '".$idUsuario."')");
            }
          }
          $conexao->query("DELETE FROM prazosUsuarios WHERE idPrazo='".$id."' AND idUsuario NOT IN (".implode(", ", $_POST['advogados']).")");
        } else {
          $conexao->query("DELETE FROM prazosUsuarios WHERE idPrazo='".$id."'");
        }

        $_SESSION['retorno'] = "ok-atualizar";
      } else {
        $_SESSION['retorno'] = "erro-atualizar";
		die("Ocorreu um erro ao atualizar: (".$conexao->errno." -> ".$conexao->error."). Por favor, copie esta linha e envie para o programador.");
      }
      redireciona(URL_SISTEMA."adm-form-prazos.php");
    }

    if(isset($_GET['acao']) && $_GET['acao'] == "excluir") {
      $sqlPrazo = $conexao->query("DELETE FROM prazos WHERE id='".$id."'");
      if($sqlPrazo && $conexao->affected_rows > 0) {
        $_SESSION['retorno'] = "ok-excluir";
        redireciona(URL_SISTEMA."adm-list-prazos-data.php");
      } else {
        $_SESSION['retorno'] = "erro-excluir";
        redireciona(URL_SISTEMA."adm-form-prazos.php?id=".$id);
      }
    }

    $verfPrazo = $conexao->query("SELECT * FROM prazos WHERE id='".$id."'");
    if($verfPrazo && $verfPrazo->num_rows > 0) {
      $dadosP = $verfPrazo->fetch_array(MYSQLI_ASSOC);
      foreach($dadosP as $chave => $valor) {
        $$chave = $valor;
      }

      $advogados = array();
      $prazosUsu = $conexao->query("SELECT * FROM prazosUsuarios WHERE idPrazo='".$id."'");
      while($dadosPU = $prazosUsu->fetch_array(MYSQLI_ASSOC)) {
        $advogados[]      = $dadosPU['idUsuario'];
      }

      $dataMinima = "1900-01-01";
    } else {
      $_SESSION['retorno'] = "erro-inexistente";
      redireciona(URL_SISTEMA."adm-list-prazos-data.php");
    }
  } else {
    if(isset($_POST['submitPrazo'])) {
      $tipo             = $conexao->real_escape_string($_POST['tipo']);
      $data             = formataDataSQL($conexao->real_escape_string($_POST['data']));
      $observacao       = $conexao->real_escape_string($_POST['observacao']);
      $conteudo         = $conexao->real_escape_string($_POST['conteudo']);
      $prazo            = $conexao->real_escape_string($_POST['prazo']);
      $status           = $conexao->real_escape_string($_POST['status']);
      $datahoracumprido = formataDataHoraSQL($conexao->real_escape_string($_POST['datahoracumprido']));

      $sqlPrazo = $conexao->query("INSERT INTO prazos (tipo, data, observacao, conteudo, prazo, status, dataHoraCumprido) VALUE ('".$tipo."', '".$data."', '".$observacao."', '".$conteudo."', '".$prazo."', '".$status."', '".$datahoracumprido."')");
      if($sqlPrazo && $conexao->affected_rows > 0) {
        $idPrazo = $conexao->insert_id;

        foreach($_POST['advogados'] as $chave => $valor) {
          $idUsuario = $conexao->real_escape_string($valor);
          $conexao->query("INSERT INTO prazosUsuarios (idPrazo, idUsuario) VALUES ('".$idPrazo."', '".$idUsuario."')");
        }

        $_SESSION['retorno'] = "ok-cadastrar";
        redireciona(URL_SISTEMA."adm-form-prazos.php");
      } else {
        $_SESSION['retorno'] = "erro-cadastrar";
		die("Ocorreu um erro ao cadastrar: (".$conexao->errno." -> ".$conexao->error."). Por favor, copie esta linha e envie para o programador.");
        redireciona(URL_SISTEMA."adm-list-prazos-data.php");
      }
    }

    $dataMinima = date("Y-m-d");
  }

  $tipos = array("administrativo" => "Administrativo", "civil" => "Cível", "trabalhista" => "Trabalhista");

  if(isset($_SESSION['retorno'])) {
    if($_SESSION['retorno'] == "ok-atualizar") {
      $titulo   = "Sucesso";
      $mensagem = "O prazo foi atualizado com sucesso!";
      $classe   = "success";
      $icone    = "fa-thumbs-up";
    } elseif($_SESSION['retorno'] == "erro-atualizar") {
      $titulo   = "Erro";
      $mensagem = "Ocorreu um erro ao atualizar o prazo! Por favor tente novamente!";
      $classe   = "error";
      $icone    = "fa-warning";
    } elseif($_SESSION['retorno'] == "ok-cadastrar") {
      $titulo   = "Sucesso";
      $mensagem = "O prazo foi cadastrado com sucesso!";
      $classe   = "success";
      $icone    = "fa-thumbs-up";
    } elseif($_SESSION['retorno'] == "erro-cadastrar") {
      $titulo   = "Erro";
      $mensagem = "Ocorreu um erro ao cadastrar o prazo! Por favor tente novamente!";
      $classe   = "error";
      $icone    = "fa-warning";
    } elseif($_SESSION['retorno'] == "erro-excluir") {
      $titulo   = "Erro";
      $mensagem = "Ocorreu um erro ao excluir o prazo! Por favor tente novamente!";
      $classe   = "error";
      $icone    = "fa-warning";
    }
  }
?>
<body class="fixed-left">
  <? include_once("include/modal-logout.php"); ?>

  <!-- Begin page -->
  <div id="wrapper">

    <? include_once("include/topbar.php"); ?>
    <? include_once("include/leftbar.php"); ?>

    <!-- Start right content -->
    <div class="content-page">
      <!-- ============================================================== -->
      <!-- Start Content here -->
      <!-- ============================================================== -->
      <div class="content">
        <div class="row">
          <form action="adm-form-prazos.php<?=isset($id)?"?id=".$id:"";?>" method="POST" role="form">
            <div class="col-sm-12">
              <div class="widget shadow-widget">
                <div class="widget-header transparent">
                  <h2><?=str_replace("Prazo", "<strong>Prazo</strong>", $title);?></h2>
                </div>
                <div class="widget-content padding">
                  <div class="row">
                    <div class="col-sm-6">
                      <div class="form-group">
                        <label>Tipo</label>
                        <select name="tipo" class="form-control">
                          <? foreach($tipos as $chave => $valor) { ?>
                          <option value="<?=$chave;?>" <?=(isset($tipo) && $tipo == $chave)?"selected=\"selected\"":"";?>><?=$valor;?></option>
                          <? } ?>
                        </select>
                      </div>
                    </div>
                    <div class="col-sm-6">
                      <div class="form-group">
                        <label>Data</label>
                        <input type="text" name="data" class="form-control data" data-mask="99/99/9999" placeholder="Data" value="<?=isset($data)?formataDataBR($data):"";?>">
                      </div>
                    </div>
                  </div>
                  <div class="clearfix"></div>
                  <div class="form-group">
                    <label>Prazo</label>
                    <input type="text" name="prazo" class="form-control" placeholder="Prazo" value="<?=isset($prazo)?$prazo:"";?>">
                  </div>
                  <div class="form-group">
                    <label>Observação</label>
                    <textarea name="observacao" class="form-control" rows="5" placeholder="Observação"><?=isset($observacao)?($observacao):"";?></textarea>
                  </div>
                  <div class="form-group">
                    <label>Conteúdo</label>
                    <textarea name="conteudo" class="form-control" rows="15" placeholder="Conteúdo"><?=isset($conteudo)?($conteudo):"";?></textarea>
                  </div>
                  <div class="row">
                    <div class="col-sm-6">
                      <div class="form-group">
                        <label>Status</label>
                        <select name="status" class="form-control">
                          <option value="0" <?=(isset($status) && $status == "0")?"selected=\"selected\"":"";?>>Não cumprido</option>
                          <? 
                            $usuarios = $conexao->query("SELECT * FROM usuarios ORDER BY nome");
                            while($dadosU = $usuarios->fetch_array(MYSQLI_ASSOC)) {
                          ?>
                          <option value="<?=$dadosU['id'];?>" <?=(isset($status) && $status == $dadosU['id'])?"selected=\"selected\"":"";?>>Cumprido por <?=$dadosU['nome'];?> <?=$dadosU['sobrenome'];?></option>
                          <?
                            }
                          ?>
                        </select>
                      </div>
                    </div>
                    <div class="col-sm-6">
                      <div class="form-group">
                        <label>Data / Hora Cumprido</label>
                        <input type="text" name="datahoracumprido" class="form-control dataHora" data-mask="99/99/9999 99:99:99" placeholder="Data / Hora Cumprido" value="<?=isset($datahoracumprido)?formataDataHoraBR($datahoracumprido):"";?>">
                      </div>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Advogados</label>
                    <select name="advogados[]" multiple="multiple" class="form-control advogados" style="height:auto;">
                      <? 
                        $usuarios = $conexao->query("SELECT * FROM usuarios WHERE ativo=1 ORDER BY nome");
                        while($dadosU = $usuarios->fetch_array(MYSQLI_ASSOC)) {
                      ?>
                      <option value="<?=$dadosU['id'];?>" <?=(isset($advogados) && in_array($dadosU['id'], $advogados))?"selected=\"selected\"":"";?>><?=$dadosU['nome'];?> <?=$dadosU['sobrenome'];?></option>
                      <?
                        }
                      ?>
                    </select>
                  </div>
                  <button type="submit" name="submitPrazo" class="btn btn-block btn-success">Salvar Prazo</button>
                  <? if(isset($_GET['id'])) { ?>
                  <a href="adm-form-prazos.php?id=<?=$id;?>&acao=excluir" onclick="javascript:return confirm('Você tem certeza que deseja excluir este prazo?');" class="btn btn-block btn-danger">Excluir Prazo</a>
                  <? } ?>
                </div>
              </div>
            </div>
          </form>

        </div>        

        <? include_once("include/footer.php"); ?>
      </div>
      <!-- ============================================================== -->
      <!-- End content here -->
      <!-- ============================================================== -->

    </div>
    <!-- End right content -->

  </div>
  <!-- End of page -->
  <!-- the overlay modal element -->
  <div class="md-overlay"></div>
  <!-- End of eoverlay modal -->
  <? include_once("include/scripts.php"); ?>

  <script type="text/javascript">
  $(document).ready(function(){
    <? if(isset($_SESSION['retorno'])) { ?>
    $.notify({
        title: '<?=$titulo;?>',
        text: '<?=$mensagem;?>',
        image: "<i class='fa <?=$icone;?>'></i>"
    }, {
        style: 'metro',
        className: '<?=$classe;?>',
        globalPosition: 'top right',
        showAnimation: "show",
        showDuration: 0,
        hideDuration: 0,
        autoHideDelay: 5000,
        autoHide: true,
        clickToHide: true
    });
    <? unset($_SESSION['retorno']); } ?>

    $('.advogados').select2();

    $('.data').datetimepicker({ locale: 'pt-BR', format: 'DD/MM/YYYY', daysOfWeekDisabled: [0, 6], minDate:'<?=$dataMinima;?>', keepOpen: false });
    $('.dataHora').datetimepicker({ locale: 'pt-BR', format: 'DD/MM/YYYY HH:mm:00', daysOfWeekDisabled: [0, 6], keepOpen: false });
  });
  </script>
</body>
</html>