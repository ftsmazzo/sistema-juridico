<? 
  include_once("include/configuracoes.php");
  include_once("include/funcoes.php");
  include_once("include/seguranca.php");

  $title = "Alterar dados";
  include_once("include/header.php");

  $conexao = new mysqli(SERVIDOR, USUARIO, SENHA, BANCO);
  if($conexao->connect_error) {
    die("Connect Error (".$conexao->connect_errno.")".$conexao->connect_error);
  }
  $conexao->query("SET CHARACTER SET utf8");
  $conexao->query("SET NAMES 'utf8'");

  $seguranca = new seguranca;
  $seguranca->verificarLogin();

  $usuario = $conexao->query("SELECT * FROM usuarios WHERE id='".$_SESSION['cod']."' AND ativo=1");
  if($usuario) {
    $dadosU    = $usuario->fetch_array(MYSQLI_ASSOC);

    $nome      = $dadosU['nome'];
    $sobrenome = $dadosU['sobrenome'];
    $email     = $dadosU['email'];
    $celular   = $dadosU['celular'];
    $login     = $dadosU['login'];
  } else {
    $seguranca->efetuarLogout();
  }

  if(isset($_POST) && isset($_POST['alterar-dados'])) {
    $nome      = $conexao->real_escape_string($_POST['nome']);
    $sobrenome = $conexao->real_escape_string($_POST['sobrenome']);
    $email     = $conexao->real_escape_string($_POST['email']);
    $celular   = $conexao->real_escape_string($_POST['celular']);
    $login     = $conexao->real_escape_string($_POST['login']);
    
    $usuario = $conexao->query("UPDATE usuarios SET nome='".$nome."', sobrenome='".$sobrenome."', email='".$email."', celular='".$celular."', login='".$login."' WHERE id='".$_SESSION['cod']."'");
    if($usuario && $conexao->affected_rows > 0) {
      $_SESSION['retorno'] = "ok-dados";
    } else {
      $_SESSION['retorno'] = "erro-dados";
    } 
    redireciona(URL_SISTEMA."alterar-dados.php");   
  } elseif(isset($_POST) && isset($_POST['alterar-senha'])) {
    $senhaAtual      = $conexao->real_escape_string($_POST['senha-atual']);
    $novaSenha       = $conexao->real_escape_string($_POST['nova-senha']);
    $repitaNovaSenha = $conexao->real_escape_string($_POST['repita-nova-senha']);
    
    $senha = $conexao->query("SELECT * FROM usuarios WHERE id='".$_SESSION['cod']."' AND senha='".md5($senhaAtual)."'");
    if($senha && $senha->num_rows > 0) {
      if($novaSenha == $repitaNovaSenha) {
        $uSenha = $conexao->query("UPDATE usuarios SET senha='".md5($novaSenha)."' WHERE id='".$_SESSION['cod']."'");
        if($uSenha && $conexao->affected_rows > 0) {
          $_SESSION['retorno'] = "ok-senha";
        } else {
          $_SESSION['retorno'] = "erro-senha";
        }
      } else {
        $_SESSION['retorno'] = "erro-senhas-diferentes";
      }
    } else {
      $_SESSION['retorno'] = "erro-senha-atual";
    }
    redireciona(URL_SISTEMA."alterar-dados.php");
  }

  if(isset($_SESSION['retorno'])) {
    if($_SESSION['retorno'] == "ok-dados") {
      $titulo   = "Sucesso";
      $mensagem = "Os seus dados foram atualizados com sucesso!";
      $classe   = "success";
      $icone    = "fa-thumbs-up";
    } elseif($_SESSION['retorno'] == "erro-dados") {
      $titulo   = "Erro";
      $mensagem = "Ocorreu um erro ao atualizar os dados! Por favor tente novamente!";
      $classe   = "error";
      $icone    = "fa-warning";
    } elseif($_SESSION['retorno'] == "ok-senha") {
      $titulo   = "Sucesso";
      $mensagem = "A sua senha foi atualizada com sucesso!";
      $classe   = "success";
      $icone    = "fa-thumbs-up";
    } elseif($_SESSION['retorno'] == "erro-senha") {
      $titulo   = "Erro";
      $mensagem = "Ocorreu um erro ao atualizar a senha! Por favor tente novamente!";
      $classe   = "error";
      $icone    = "fa-warning";
    } elseif($_SESSION['retorno'] == "erro-senha-atual") {
      $titulo   = "Senha atual incorreta";
      $mensagem = "A senha atual está incorreta.";
      $classe   = "error";
      $icone    = "fa-warning";
    } elseif($_SESSION['retorno'] == "erro-senhas-diferentes") {
      $titulo   = "Erro";
      $mensagem = "As senhas informadas não são iguais.";
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

          <div class="col-sm-6">
            <div class="widget">
              <div class="widget-header transparent">
                <h2>Alterar <strong>Dados</strong></h2>
              </div>
              <div class="widget-content padding">              
                <form action="alterar-dados.php" method="POST" role="form">
                  <div class="form-group">
                    <label>Nome</label>
                    <input type="text" name="nome" class="form-control" placeholder="Nome" value="<?=(isset($nome))?$nome:"";?>">
                  </div>
                  <div class="form-group">
                    <label>Sobrenome</label>
                    <input type="text" name="sobrenome" class="form-control" placeholder="Sobrenome" value="<?=(isset($sobrenome))?$sobrenome:"";?>">
                  </div>
                  <div class="form-group">
                    <label>E-mail</label>
                    <input type="text" name="email" class="form-control" placeholder="E-mail" value="<?=(isset($email))?$email:"";?>">
                  </div>
                  <div class="form-group">
                    <label>Celular</label>
                    <input type="text" name="celular" class="form-control" placeholder="Celular" value="<?=(isset($celular))?$celular:"";?>">
                  </div>
                  <div class="form-group">
                    <label>Login</label>
                    <input type="text" name="login" class="form-control" placeholder="Login" value="<?=(isset($login))?$login:"";?>">
                  </div>
                  <button type="submit" name="alterar-dados" class="btn btn-default">Alterar dados</button>
                </form>
              </div>
            </div>
          </div>
          
          <div class="col-sm-6">            
            <div class="widget">
              <div class="widget-header transparent">
                <h2>Alterar <strong>Senha</strong></h2>
              </div>
              <div class="widget-content padding">            
                <form action="alterar-dados.php" method="POST" role="form">
                  <div class="form-group">
                    <label>Senha atual</label>
                    <input type="password" name="senha-atual" class="form-control" placeholder="Senha atual">
                  </div>
                  <div class="form-group">
                    <label>Nova senha</label>
                    <input type="password" name="nova-senha" class="form-control" placeholder="Nova senha">
                  </div>
                  <div class="form-group">
                    <label>Repita a nova senha</label>
                    <input type="password" name="repita-nova-senha" class="form-control" placeholder="Repita a nova senha">
                  </div>
                  <button type="submit" name="alterar-senha" class="btn btn-default">Alterar senha</button>
                </form>
              </div>
            </div>
          </div>

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
  });
  </script>
</body>
</html>