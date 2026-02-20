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

  if(isset($_GET['data']) && !empty($_GET['data']) && dataValida($_GET['data'])) {
    $data = $conexao->real_escape_string($_GET['data']);
  } else {
    redireciona(URL_SISTEMA."adm-list-prazos-data.php");
  }

  $tipos = array("administrativo" => "Administrativo", "civil" => "Cível", "trabalhista" => "Trabalhista");
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
                <h2>Lista de <strong>Prazos</strong> em <?=formataDataBR($data);?></h2>
              </div>
              <div class="widget-content padding">
                <table id="datatables" class="table table-striped table-bordered" cellspacing="0" width="100%">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Conteúdo</th>
                      <th>Status</th>
                    </tr>
                  </thead>                   
                  <tbody>
                    <?
                      $prazos = $conexao->query("SELECT p.*, CONCAT(u.nome, ' ', u.sobrenome) as usuario FROM prazos p LEFT JOIN usuarios u ON p.status=u.id WHERE p.data='".$data."'");
                      while($dadosP = $prazos->fetch_array(MYSQLI_ASSOC)) {
                        if($dadosP['status'] != 0) { 
                          $status = "Cumprido por ".$dadosP['usuario']." em ".formataDataHoraBr($dadosP['datahoracumprido']);
                        } else { 
                          $status = "Não cumprido";
                        }
                    ?>
                    <tr>
                      <td class="text-center center-block-table"><a href="adm-form-prazos.php?id=<?=$dadosP['id'];?>"><?=$tipos[$dadosP['tipo']];?></a></td>
                      <td class="text-center center-block-table"><a href="adm-form-prazos.php?id=<?=$dadosP['id'];?>"><?=substr(nl2br(trim($dadosP['conteudo'])), 0);?></a></td>
                      <td class="text-center center-block-table"><a href="adm-form-prazos.php?id=<?=$dadosP['id'];?>"><?=$status;?></a></td>
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