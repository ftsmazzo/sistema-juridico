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

  if(isset($_SESSION['retorno'])) {
    if($_SESSION['retorno'] == "erro-inixistente") {
      $titulo   = "Erro";
      $mensagem = "O prazo que você tentou acessar não esta mais disponível!";
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
                <h2>Lista de <strong>Prazos</strong> por data</h2>
              </div>
              <div class="widget-content padding">
                <table id="datatables" class="table table-striped table-bordered" cellspacing="0" width="100%">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Num. de Prazos</th>
                    </tr>
                  </thead>                   
                  <tbody>
                    <?
                      $dataPrazos = $conexao->query("SELECT data, count(*) as numPrazos FROM prazos GROUP BY data");
                      while($dadosDP = $dataPrazos->fetch_array(MYSQLI_ASSOC)) {
                    ?>
                    <tr>
                      <td class="text-center"><a href="adm-list-prazos.php?data=<?=$dadosDP['data'];?>"><?=formataDataBR($dadosDP['data']);?></a></td>
                      <td class="text-center"><a href="adm-list-prazos.php?data=<?=$dadosDP['data'];?>"><?=$dadosDP['numPrazos'];?></a></td>
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

    $.extend($.fn.dataTableExt.oSort, {
      "date-uk-pre": function ( a ) {
          var ukDatea = a.split('/');
          return (ukDatea[2] + ukDatea[1] + ukDatea[0]) * 1;
      },
      "date-uk-asc": function ( a, b ) {
          return ((a < b) ? -1 : ((a > b) ? 1 : 0));
      },
      "date-uk-desc": function ( a, b ) {
          return ((a < b) ? 1 : ((a > b) ? -1 : 0));
      }
    });

    $("#datatables").dataTable({
      "aoColumns": [
        { "sType": "date-uk" },
        null
      ]
    });
  });
  </script>
</body>
</html>