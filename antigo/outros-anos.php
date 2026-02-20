<? 
  include_once("include/configuracoes.php");
  include_once("include/funcoes.php");
  include_once("include/seguranca.php");

  $title = "Outros anos";
  include_once("include/header.php");

  $conexao = new mysqli(SERVIDOR, USUARIO, SENHA, BANCO);
  if($conexao->connect_error) {
    die("Connect Error (".$conexao->connect_errno.")".$conexao->connect_error);
  }
  $conexao->query("SET CHARACTER SET utf8");
  $conexao->query("SET NAMES 'utf8'");

  $seguranca = new seguranca;
  $seguranca->verificarLogin();

  if(isset($_GET['ano'])) {
    $ano = $conexao->real_escape_string($_GET['ano']);
  } else {
    redireciona(URL_SISTEMA);
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
          <div class="col-md-12">
            <div class="widget black-1">
              <div class="widget-content col-sm-12">              
                <?=montaCalendarioAno($ano);?>
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
    var prazos = [
        <?
          $dataAtual = new DateTime(date("Y-m-d"));
          $verfPrazos = $conexao->query("SELECT * FROM prazos WHERE YEAR(data) = ".$ano." GROUP BY data");
          if($verfPrazos && $verfPrazos->num_rows > 0) {
            while($dadosP = $verfPrazos->fetch_array(MYSQLI_ASSOC)) {
              $dataPrazo = new DateTime($dadosP['data']);

              $verfStatus = $conexao->query("SELECT * FROM prazos WHERE data='".$dadosP['data']."' AND status=0 GROUP BY status");
              if($verfStatus && $verfStatus->num_rows > 0) {
                if($dataPrazo < $dataAtual) { $status = "vencido"; }
                elseif($dataPrazo == $dataAtual) { $status = "atual"; }
                elseif($dataPrazo > $dataAtual) { $status = "em-dia"; }
              } else {
                $status = "concluido";
              }
        ?>
        { "data": '<?=$dadosP["data"];?>', "link": 'visualizar-prazos.php?data=<?=$dadosP["data"];?>', "status": '<?=$status;?>' },
        <?
            }
          }
        ?>
    ];

    $('.domingo, .sabado').each(function(chave, valor){
      $(this).addClass('inativo');
    });

    $.each(prazos, function(chave, valor){
        $("."+valor['data']).addClass(valor['status']);
        $($("."+valor['data'])).html('<a href="'+valor['link']+'">'+$("."+valor['data']).text()+'</a>');
    });

  });
  </script>
</body>
</html>