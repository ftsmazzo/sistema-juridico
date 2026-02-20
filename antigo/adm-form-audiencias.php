<? 
  include_once("include/configuracoes.php");
  include_once("include/funcoes.php");
  include_once("include/seguranca.php");

  if(isset($_GET['id'])) { $title = "Editar Audiência"; } else { $title = "Cadastrar nova Audiência"; }
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

    if(isset($_POST['submitAudiencia'])) {
      $numprocesso  = $conexao->real_escape_string($_POST['numprocesso']);
      $vara         = $conexao->real_escape_string($_POST['vara']);
      $local        = $conexao->real_escape_string($_POST['local']);
      $reclamante   = $conexao->real_escape_string($_POST['reclamante']);
      $reclamado    = $conexao->real_escape_string($_POST['reclamado']);
      $preposto     = $conexao->real_escape_string($_POST['preposto']);
      $datahora     = formataDataHoraSQL($conexao->real_escape_string($_POST['datahora']));
      $observacao   = $conexao->real_escape_string($_POST['observacao']);
      
      $sqlAudiencia = $conexao->query("UPDATE audiencias SET numProcesso='".$numprocesso."', vara='".$vara."', local='".$local."', reclamante='".$reclamante."', reclamado='".$reclamado."', preposto='".$preposto."', dataHora='".$datahora."', observacao='".$observacao."' WHERE id='".$id."'");
      if($sqlAudiencia) {
        if(isset($_POST['advogados']) && count($_POST['advogados']) > 0) {
          foreach($_POST['advogados'] as $chave => $valor) {
            $idUsuario = $conexao->real_escape_string($valor);
            $verfPU = $conexao->query("SELECT * FROM audienciasUsuarios WHERE idAudiencia='".$id."' AND idUsuario='".$idUsuario."'");
            if($verfPU && $verfPU->num_rows == 0) {
              $conexao->query("INSERT INTO audienciasUsuarios (idAudiencia, idUsuario) VALUES ('".$id."', '".$idUsuario."')");
            }
          }
          $conexao->query("DELETE FROM audienciasUsuarios WHERE idAudiencia='".$id."' AND idUsuario NOT IN (".implode(", ", $_POST['advogados']).")");
        } else {
          $conexao->query("DELETE FROM audienciasUsuarios WHERE idAudiencia='".$id."'");
        }

        $_SESSION['retorno'] = "ok-atualizar";
      } else {
        $_SESSION['retorno'] = "erro-atualizar";
      }
      redireciona(URL_SISTEMA."adm-form-audiencias.php?id=".$id);      
    }

    if(isset($_GET['acao']) && $_GET['acao'] == "excluir") {
      $sqlAudiencia = $conexao->query("DELETE FROM audiencias WHERE id='".$id."'");
      if($sqlAudiencia && $conexao->affected_rows > 0) {
        $_SESSION['retorno'] = "ok-excluir";
        redireciona(URL_SISTEMA."adm-list-audiencias.php");
      } else {
        $_SESSION['retorno'] = "erro-excluir";
        redireciona(URL_SISTEMA."adm-form-audiencias.php?id=".$id);
      }
    }

    $verfAudiencia = $conexao->query("SELECT * FROM audiencias WHERE id='".$id."'");
    if($verfAudiencia && $verfAudiencia->num_rows > 0) {
      $dadosA = $verfAudiencia->fetch_array(MYSQLI_ASSOC);
      foreach($dadosA as $chave => $valor) {
        $$chave = $valor;
      }

      $advogados = array();
      $audienciasUsu = $conexao->query("SELECT * FROM audienciasUsuarios WHERE idAudiencia='".$id."'");
      while($dadosAU = $audienciasUsu->fetch_array(MYSQLI_ASSOC)) {
        $advogados[]      = $dadosAU['idUsuario'];
      }
    } else {
      $_SESSION['retorno'] = "erro-inexistente";
      redireciona(URL_SISTEMA."adm-list-audiencias.php");
    }
  } else {
    if(isset($_POST['submitAudiencia'])) {
      $numprocesso  = $conexao->real_escape_string($_POST['numprocesso']);
      $vara         = $conexao->real_escape_string($_POST['vara']);
      $local        = $conexao->real_escape_string($_POST['local']);
      $reclamante   = $conexao->real_escape_string($_POST['reclamante']);
      $reclamado    = $conexao->real_escape_string($_POST['reclamado']);
      $preposto     = $conexao->real_escape_string($_POST['preposto']);
      $datahora     = formataDataHoraSQL($conexao->real_escape_string($_POST['datahora']));
      $observacao   = $conexao->real_escape_string($_POST['observacao']);

      $sqlAudiencia = $conexao->query("INSERT INTO audiencias (numProcesso, vara, local, reclamante, reclamado, preposto, dataHora, observacao) VALUE ('".$numprocesso."', '".$vara."', '".$local."', '".$reclamante."', '".$reclamado."', '".$preposto."', '".$datahora."', '".$observacao."')");
      if($sqlAudiencia && $conexao->affected_rows > 0) {
        $idAudiencia = $conexao->insert_id;

        foreach($_POST['advogados'] as $chave => $valor) {
          $idUsuario = $conexao->real_escape_string($valor);
          $conexao->query("INSERT INTO audienciasUsuarios (idAudiencia, idUsuario) VALUES ('".$idAudiencia."', '".$idUsuario."')");
        }

        $_SESSION['retorno'] = "ok-cadastrar";
        redireciona(URL_SISTEMA."adm-form-audiencias.php?id=".$idAudiencia);
      } else {
        $_SESSION['retorno'] = "erro-cadastrar";
        redireciona(URL_SISTEMA."adm-list-audiencias.php");
      }
    }
  }

  if(isset($_SESSION['retorno'])) {
    if($_SESSION['retorno'] == "ok-atualizar") {
      $titulo   = "Sucesso";
      $mensagem = "A audiência foi atualizado com sucesso!";
      $classe   = "success";
      $icone    = "fa-thumbs-up";
    } elseif($_SESSION['retorno'] == "erro-atualizar") {
      $titulo   = "Erro";
      $mensagem = "Ocorreu um erro ao atualizar a audiência! Por favor tente novamente!";
      $classe   = "error";
      $icone    = "fa-warning";
    } elseif($_SESSION['retorno'] == "ok-cadastrar") {
      $titulo   = "Sucesso";
      $mensagem = "A audiência foi cadastrado com sucesso!";
      $classe   = "success";
      $icone    = "fa-thumbs-up";
    } elseif($_SESSION['retorno'] == "erro-cadastrar") {
      $titulo   = "Erro";
      $mensagem = "Ocorreu um erro ao cadastrar a audiência! Por favor tente novamente!";
      $classe   = "error";
      $icone    = "fa-warning";
    } elseif($_SESSION['retorno'] == "erro-excluir") {
      $titulo   = "Erro";
      $mensagem = "Ocorreu um erro ao excluir a audiência! Por favor tente novamente!";
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
          <form action="adm-form-audiencias.php<?=isset($id)?"?id=".$id:"";?>" method="POST" role="form">
            <div class="col-sm-12">
              <div class="widget shadow-widget">
                <div class="widget-header transparent">
                  <h2><?=str_replace("Audiência", "<strong>Audiência</strong>", $title);?></h2>
                </div>
                <div class="widget-content padding">
                  <div class="row">
                    <div class="col-sm-6">
                      <div class="form-group">
                        <label>Núm. Processo</label>
                        <input type="text" name="numprocesso" class="form-control" placeholder="Núm. Processo" value="<?=isset($numprocesso)?$numprocesso:"";?>">
                      </div>
                    </div>

                    <div class="col-sm-6">
                      <div class="form-group">
                        <label>Vara</label>
                        <input type="text" name="vara" class="form-control" placeholder="Vara" value="<?=isset($vara)?$vara:"";?>">
                      </div>
                    </div>
                  </div>
                  <div class="clearfix"></div>
                  <div class="row">
                    <div class="col-sm-6">
                      <div class="form-group">
                        <label>Local</label>
                        <input type="text" name="local" class="form-control" placeholder="Local" value="<?=isset($local)?$local:"";?>">
                      </div>
                    </div>
                  
                    <div class="col-sm-6">
                      <div class="form-group">
                        <label>Data / Hora</label>
                        <input type="text" name="datahora" class="form-control dataHora" placeholder="Data / Hora" value="<?=isset($datahora)?formataDataHoraBR($datahora):"";?>">
                      </div>
                    </div>
                  </div>
                  <div class="clearfix"></div>
                  <div class="row">
                    <div class="col-sm-4">
                      <div class="form-group">
                        <label>Reclamante</label>
                        <input type="text" name="reclamante" class="form-control" placeholder="Reclamante" value="<?=isset($reclamante)?$reclamante:"";?>">
                      </div>
                    </div>

                    <div class="col-sm-4">
                      <div class="form-group">
                        <label>Reclamado</label>
                        <input type="text" name="reclamado" class="form-control" placeholder="Reclamado" value="<?=isset($reclamado)?$reclamado:"";?>">
                      </div>
                    </div>

                    <div class="col-sm-4">
                      <div class="form-group">
                        <label>Preposto</label>
                        <input type="text" name="preposto" class="form-control" placeholder="Preposto" value="<?=isset($preposto)?$preposto:"";?>">
                      </div>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Observação</label>
                    <textarea name="observacao" class="form-control" placeholder="Observação"><?=isset($observacao)?$observacao:"";?></textarea>
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
                  <button type="submit" name="submitAudiencia" class="btn btn-block btn-success">Salvar Audiência</button>
                  <? if(isset($_GET['id'])) { ?>
                  <a href="adm-form-audiencias.php?id=<?=$id;?>&acao=excluir" onclick="javascript:return confirm('Você tem certeza que deseja excluir esta audiência?');" class="btn btn-block btn-danger">Excluir Audiência</a>
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

    $('.dataHora').datetimepicker({ locale: 'pt-BR', format: 'DD/MM/YYYY HH:mm:00', daysOfWeekDisabled: [0, 6], keepOpen: true });
  });
  </script>
</body>
</html>