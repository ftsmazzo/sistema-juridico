<? 
  include_once("include/configuracoes.php");
  include_once("include/funcoes.php");
  include_once("include/seguranca.php");

  $title = "Login";
  include_once("include/header.php");

  $conexao = new mysqli(SERVIDOR, USUARIO, SENHA, BANCO);
  if($conexao->connect_error) {
    die("Connect Error (".$conexao->connect_errno.")".$conexao->connect_error);
  }

  $seguranca = new seguranca;

  if(isset($_POST['login']) && isset($_POST['senha'])) {
    $login = $conexao->real_escape_string($_POST['login']);
    $senha = $conexao->real_escape_string($_POST['senha']);

    if($seguranca->efetuarLogin($login, $senha)) {
        redireciona(URL_SISTEMA);
    } else {
        $erro = true;
    }
  }
?>
    <body class="fixed-left login-page">

    	<!-- Begin page -->
    	<div class="container">
    		<div class="full-content-center">
    			<p class="text-center"><a href="#"><img src="images/logo.jpg" alt="Coelho Vignini"></a></p>
    			<div class="login-wrap animated flipInX">
    				<div class="login-block">
    					<form role="form" method="POST" action="login.php">
    						<div class="form-group login-input">
    							<i class="fa fa-user overlay"></i>
    							<input type="text" name="login" class="form-control text-input" placeholder="Usuário">
    						</div>
    						<div class="form-group login-input">
    							<i class="fa fa-key overlay"></i>
    							<input type="password" name="senha" class="form-control text-input" placeholder="********">
    						</div>

    						<div class="row">
    							<div class="col-sm-12">
    								<button type="submit" class="btn btn-success btn-block">ENTRAR</button>
    							</div>
    						</div>
    					</form>
    				</div>
    			</div>

    		</div>
    	</div>
    	<!-- the overlay modal element -->
    	<div class="md-overlay"></div>
    	<!-- End of eoverlay modal -->
    	<? include_once("include/scripts.php"); ?>
        
        <? if(isset($erro)) { ?>
        <script type="text/javascript">
        $.notify({
            title: 'Usuário e/ou senha inválidos',
            text: 'Por favor, verifique os dados e tente novamente.',
            image: "<i class='fa fa-warning'></i>"
        }, {
            style: 'metro',
            className: 'error',
            globalPosition: 'top right',
            showAnimation: "show",
            showDuration: 0,
            hideDuration: 0,
            autoHideDelay: 5000,
            autoHide: true,
            clickToHide: true
        });
        </script>
        <? } ?>
    </body>
</html>