<? 
  include_once("include/configuracoes.php");
  include_once("include/funcoes.php");
  include_once("include/seguranca.php");

  $title = "Agenda de contatos";
  include_once("include/header.php");

  $conexao = new mysqli(SERVIDOR, USUARIO, SENHA, BANCO);
  if($conexao->connect_error) {
    die("Connect Error (".$conexao->connect_errno.")".$conexao->connect_error);
  }
  $conexao->query("SET CHARACTER SET utf8");
  $conexao->query("SET NAMES 'utf8'");

  $seguranca = new seguranca;
  $seguranca->verificarLogin();
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
              
              <div class="col-sm-10 col-sm-offset-1">
                <br/>
                <form role="form">
                  <div class="form-group">
                    <input type="text" class="form-control" name="pesquisarContato" placeholder="Pesquisar um contato...">
                  </div>
                </form>
              </div>
              
              <ul class="media-list contatos">
                <?
                  $letra    = null;
                  $agenda = $conexao->query("SELECT * FROM agenda ORDER BY nome");
                  while($dadosC = $agenda->fetch_array(MYSQLI_ASSOC)) {
                    if($letra !== strtoupper(substr($dadosC['nome'], 0, 1))) {
                      $letra = strtoupper(substr($dadosC['nome'], 0, 1));
                ?>
                <li class="media fixo">
                  <div class="clearfix"></div>
                  <div class="media-body">
                    <br/>
                    <h3><strong><?=$letra;?></strong></h3>
                  </div>
                </li>
                <? } ?>
                <li class="media col-sm-6">
                  <div class="media-body">
                    <h4 class="media-heading"><strong><?=$dadosC['nome'];?></strong></h4>
                    <p>
                      <? if(!empty($dadosC['telefone'])) { ?><i class="fa fa-phone"></i> <?=$dadosC['telefone'];?><br/><? } ?>
                      <? if(!empty($dadosC['celular'])) { ?><i class="fa fa-mobile-phone"></i> <?=$dadosC['celular'];?><br/><? } ?>
                      <? if(!empty($dadosC['email'])) { ?><i class="fa fa-envelope"></i> <?=$dadosC['email'];?><br/><? } ?>
                      <? if(!empty($dadosC['endereco'])) { ?><i class="fa fa-map-marker"></i> <?=$dadosC['endereco'];?><br/><? } ?>
                      <? if(!empty($dadosC['nascimento'])) { ?><i class="icon-calendar"></i> <?=formataDataBr($dadosC['nascimento']);?><br/><? } ?>
                      <br/>
                      <a href="adm-form-agenda.php?id=<?=$dadosC['id'];?>" title="Editar" class="btn btn-success center-block" style="color:#FFF;"><i class="icon-edit"></i> Editar</a>
                    </p>
                  </div>
                </li>
                <?
                  }
                ?>
              </ul>
              
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
    $("input[name=pesquisarContato]").keyup(function () {
      var filter = $(this).val();
      $("ul.contatos li").each(function () {
          if ($(this).text().search(new RegExp(filter, "i")) < 0 && !$(this).hasClass('fixo')) {
              $(this).hide();
          } else {
              $(this).show()
          }
      });
    });
  });
  </script>
</body>
</html>