<? 
  include_once("include/configuracoes.php");
  include_once("include/funcoes.php");
  include_once("include/seguranca.php");

  if(isset($_GET['id'])) { $title = "Editar Usuário"; } else { $title = "Cadastrar novo Usuário"; }
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

    if(isset($_POST['submitUsuario'])) {
      $fu_nome       = $conexao->real_escape_string($_POST['fu_nome']);
      $fu_sobrenome  = $conexao->real_escape_string($_POST['fu_sobrenome']);
      $fu_email      = $conexao->real_escape_string($_POST['fu_email']);
      $fu_celular    = $conexao->real_escape_string($_POST['fu_celular']);
      $fu_login      = $conexao->real_escape_string($_POST['fu_login']);
      $fu_senha      = $conexao->real_escape_string($_POST['fu_senha']);
      $fu_ativo      = $conexao->real_escape_string($_POST['fu_ativo']);
      $fu_relatorio  = $conexao->real_escape_string($_POST['fu_relatorio']);
      $fu_grupo      = $conexao->real_escape_string($_POST['fu_grupo']);

      $sqlUsuario = $conexao->query("UPDATE usuarios SET nome='".$fu_nome."', sobrenome='".$fu_sobrenome."', email='".$fu_email."', celular='".$fu_celular."', login='".$fu_login."', ativo='".$fu_ativo."', relatorio='".$fu_relatorio."', grupo='".$fu_grupo."' WHERE id='".$id."'");
      if($sqlUsuario) {
        if(!empty($fu_senha) && strlen($fu_senha) > 0) {
          $fu_senha = md5($fu_senha);
          $conexao->query("UPDATE usuarios SET senha='".$fu_senha."' WHERE id='".$id."'");
        }

        $_SESSION['retorno'] = "ok-atualizar";
      } else {
        $_SESSION['retorno'] = "erro-atualizar";
      }
      redireciona(URL_SISTEMA."adm-form-usuarios.php?id=".$id);
    }

    if(isset($_GET['acao']) && $_GET['acao'] == "excluir") {
      $sqlUsuario = $conexao->query("DELETE FROM usuarios WHERE id='".$id."'");
      if($sqlUsuario && $conexao->affected_rows > 0) {
        $_SESSION['retorno'] = "ok-excluir";
        redireciona(URL_SISTEMA."adm-list-usuarios.php");
      } else {
        $_SESSION['retorno'] = "erro-excluir";
        redireciona(URL_SISTEMA."adm-form-usuarios.php?id=".$id);
      }
    }

    $verfUsuario = $conexao->query("SELECT * FROM usuarios WHERE id='".$id."'");
    if($verfUsuario && $verfUsuario->num_rows > 0) {
      $dadosU = $verfUsuario->fetch_array(MYSQLI_ASSOC);
      foreach($dadosU as $chave => $valor) {
        $chave = "fu_".$chave;
        $$chave = $valor;
      }
    } else {
      $_SESSION['retorno'] = "erro-inexistente";
      redireciona(URL_SISTEMA."adm-list-usuarios.php");
    }
  } else {

    if(isset($_POST['submitUsuario'])) {
      $fu_nome       = $conexao->real_escape_string($_POST['fu_nome']);
      $fu_sobrenome  = $conexao->real_escape_string($_POST['fu_sobrenome']);
      $fu_email      = $conexao->real_escape_string($_POST['fu_email']);
      $fu_celular    = $conexao->real_escape_string($_POST['fu_celular']);
      $fu_login      = $conexao->real_escape_string($_POST['fu_login']);
      $fu_senha      = md5($conexao->real_escape_string($_POST['fu_senha']));
      $fu_ativo      = $conexao->real_escape_string($_POST['fu_ativo']);
      $fu_relatorio  = $conexao->real_escape_string($_POST['fu_relatorio']);
      $fu_grupo      = $conexao->real_escape_string($_POST['fu_grupo']);
      
      $sqlUsuario = $conexao->query("INSERT INTO usuarios (nome, sobrenome, email, celular, login, senha, ativo, relatorio, grupo) VALUE ('".$fu_nome."', '".$fu_sobrenome."', '".$fu_email."', '".$fu_celular."', '".$fu_login."', '".$fu_senha."', '".$fu_ativo."', '".$fu_relatorio."', '".$fu_grupo."')");
      if($sqlUsuario && $conexao->affected_rows > 0) {
        $idUsuario = $conexao->insert_id;

        $_SESSION['retorno'] = "ok-cadastrar";
        redireciona(URL_SISTEMA."adm-form-usuarios.php?id=".$idUsuario);
      } else {
        $_SESSION['retorno'] = "erro-cadastrar";
        redireciona(URL_SISTEMA."adm-list-usuarios.php");
      }
    }
  }

  $vlrAtivo     = array("0" => "Não", "1" => "Sim");
  $vlrRelatorio = array("0" => "Não", "1" => "Sim");
  $vlrGrupo     = array("usuario" => "Usuário", "admin" => "Administrador");

  if(isset($_SESSION['retorno'])) {
    if($_SESSION['retorno'] == "ok-atualizar") {
      $titulo   = "Sucesso";
      $mensagem = "O usuário foi atualizado com sucesso!";
      $classe   = "success";
      $icone    = "fa-thumbs-up";
    } elseif($_SESSION['retorno'] == "erro-atualizar") {
      $titulo   = "Erro";
      $mensagem = "Ocorreu um erro ao atualizar o usuário! Por favor tente novamente!";
      $classe   = "error";
      $icone    = "fa-warning";
    } elseif($_SESSION['retorno'] == "ok-cadastrar") {
      $titulo   = "Sucesso";
      $mensagem = "O usuário foi cadastrado com sucesso!";
      $classe   = "success";
      $icone    = "fa-thumbs-up";
    } elseif($_SESSION['retorno'] == "erro-cadastrar") {
      $titulo   = "Erro";
      $mensagem = "Ocorreu um erro ao cadastrar o usuário! Por favor tente novamente!";
      $classe   = "error";
      $icone    = "fa-warning";
    } elseif($_SESSION['retorno'] == "erro-excluir") {
      $titulo   = "Erro";
      $mensagem = "Ocorreu um erro ao excluir o usuário! Por favor tente novamente!";
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
          <form action="adm-form-usuarios.php<?=isset($id)?"?id=".$id:"";?>" method="POST" role="form">
            <div class="col-sm-12">
              <div class="widget shadow-widget">
                <div class="widget-header transparent">
                  <h2><?=str_replace("Usuário", "<strong>Usuário</strong>", $title);?></h2>
                </div>
                <div class="widget-content padding">
                  <div class="row">
                    <div class="col-sm-6">
                      <div class="form-group">
                        <label>Nome</label>
                        <input type="text" name="fu_nome" class="form-control" placeholder="Nome" value="<?=(isset($fu_nome))?$fu_nome:"";?>">
                      </div>
                    </div>
                    <div class="col-sm-6">
                      <div class="form-group">
                        <label>Sobrenome</label>
                        <input type="text" name="fu_sobrenome" class="form-control" placeholder="Sobrenome" value="<?=(isset($fu_sobrenome))?$fu_sobrenome:"";?>">
                      </div>
                    </div>
                  </div>
                  <div class="clearfix">
                  <div class="row">
                    <div class="col-sm-6">
                      <div class="form-group">
                        <label>E-mail</label>
                        <input type="text" name="fu_email" class="form-control" placeholder="E-mail" value="<?=(isset($fu_email))?$fu_email:"";?>">
                      </div>
                    </div>
                    <div class="col-sm-6">
                      <div class="form-group">
                        <label>Celular</label>
                        <input type="text" name="fu_celular" class="form-control" placeholder="Celular" value="<?=(isset($fu_celular))?$fu_celular:"";?>">
                      </div>
                    </div>
                  </div>
                  <div class="clearfix"></div>
                  <div class="row">
                    <div class="col-sm-6">
                      <div class="form-group">
                        <label>Login</label>
                        <input type="text" name="fu_login" class="form-control" placeholder="Login" value="<?=(isset($fu_login))?$fu_login:"";?>">
                      </div>
                    </div>
                    <div class="col-sm-6">
                      <div class="form-group">
                        <label>Senha</label>
                        <input type="password" name="fu_senha" class="form-control" placeholder="Senha">
                      </div>
                    </div>
                  </div>
                  <div class="clearfix">
                  <div class="row">
                    <div class="col-sm-4">
                      <div class="form-group">
                        <label>Ativo</label>
                        <select name="fu_ativo" class="form-control">
                          <? foreach($vlrAtivo as $chave => $valor) { ?>
                          <option value="<?=$chave;?>" <?=(isset($fu_ativo) && $fu_ativo == $chave)?"selected=\"selected\"":"";?>><?=$valor;?></option>
                          <? } ?>
                        </select>
                      </div>
                    </div>
                    <div class="col-sm-4">
                      <div class="form-group">
                        <label>Relatório</label>
                        <select name="fu_relatorio" class="form-control">
                          <? foreach($vlrRelatorio as $chave => $valor) { ?>
                          <option value="<?=$chave;?>" <?=(isset($fu_relatorio) && $fu_relatorio == $chave)?"selected=\"selected\"":"";?>><?=$valor;?></option>
                          <? } ?>
                        </select>
                      </div>
                    </div>
                    <div class="col-sm-4">
                      <div class="form-group">
                        <label>Grupo</label>
                        <select name="fu_grupo" class="form-control">
                          <? foreach($vlrGrupo as $chave => $valor) { ?>
                          <option value="<?=$chave;?>" <?=(isset($fu_grupo) && $fu_grupo == $chave)?"selected=\"selected\"":"";?>><?=$valor;?></option>
                          <? } ?>
                        </select>
                      </div>
                    </div>
                  </div>
                  <button type="submit" name="submitUsuario" class="btn btn-block btn-success">Salvar Usuário</button>
                  <? if(isset($_GET['id'])) { ?>
                  <a href="adm-form-usuarios.php?id=<?=$id;?>&acao=excluir" onclick="javascript:return confirm('Você tem certeza que deseja excluir este usuário?');" class="btn btn-block btn-danger">Excluir Usuário</a>
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

    $('.data').datetimepicker({ locale: 'pt-BR', format: 'DD/MM/YYYY', keepOpen: true });    
  });
  </script>
</body>
</html>