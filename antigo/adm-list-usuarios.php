<? 
  include_once("include/configuracoes.php");
  include_once("include/funcoes.php");
  include_once("include/seguranca.php");

  $title = "Lista de Prazos";
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

  $vlrAtivo     = array("0" => "Não", "1" => "Sim");
  $vlrRelatorio = array("0" => "Não", "1" => "Sim");
  $vlrGrupo     = array("usuario" => "Usuário", "admin" => "Administrador");

  if(isset($_SESSION['retorno'])) {
    if($_SESSION['retorno'] == "erro-inexistente") {
      $titulo   = "Erro";
      $mensagem = "O usuário que você tentou visualizar não existe mais no sistema!";
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

          <div class="col-sm-12">
            <div class="widget">
              <div class="widget-header transparent">
                <h2>Lista de <strong>Usuários</strong></h2>
              </div>
              <div class="widget-content padding">
                <table id="datatables" class="table table-striped table-bordered" cellspacing="0" width="100%">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Login</th>
                      <th>Ativo?</th>
                      <th>Grupo</th>
                    </tr>
                  </thead>                   
                  <tbody>
                    <?
                      $usuarios = $conexao->query("SELECT * FROM usuarios");
                      while($dadosU = $usuarios->fetch_array(MYSQLI_ASSOC)) {
                    ?>
                    <tr>
                      <td class="center-block-table"><a href="adm-form-usuarios.php?id=<?=$dadosU['id'];?>"><?=$dadosU['nome'];?></a></td>
                      <td class="center-block-table"><a href="adm-form-usuarios.php?id=<?=$dadosU['id'];?>"><?=$dadosU['login'];?></a></td>
                      <td class="center-block-table"><a href="adm-form-usuarios.php?id=<?=$dadosU['id'];?>"><?=$vlrAtivo[$dadosU['ativo']];?></a></td>
                      <td class="center-block-table"><a href="adm-form-usuarios.php?id=<?=$dadosU['id'];?>"><?=$vlrGrupo[$dadosU['grupo']];?></a></td>
                    </tr>
                    <?
                      }
                    ?>
                  </tbody>
                </table>
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

    $("#datatables").dataTable();
  });
  </script>
</body>
</html>