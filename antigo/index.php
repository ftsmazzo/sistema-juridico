<? 
  include_once("include/configuracoes.php");
  include_once("include/funcoes.php");
  include_once("include/seguranca.php");

  $title = "Dashboard";
  include_once("include/header.php");

  $conexao = new mysqli(SERVIDOR, USUARIO, SENHA, BANCO);
  if($conexao->connect_error) {
    die("Connect Error (".$conexao->connect_errno.")".$conexao->connect_error);
  }
  $conexao->query("SET CHARACTER SET utf8");
  $conexao->query("SET NAMES 'utf8'");

  $seguranca = new seguranca;
  $seguranca->verificarLogin();

  if(isset($_GET['acao']) && $_GET['acao'] == "logout") {
    $seguranca->efetuarLogout(); 
  }

  $ano = date("Y");

  $prazosDeHoje = $conexao->query("SELECT * FROM prazos WHERE data=CURDATE()");
  $prazosDeHoje = $prazosDeHoje->num_rows;

  $prazosDeHojeCumpridos = $conexao->query("SELECT * FROM prazos WHERE data=CURDATE() AND status!=0");
  $prazosDeHojeCumpridos = $prazosDeHojeCumpridos->num_rows;

  $prazosDaSemana = $conexao->query("SELECT * FROM prazos WHERE WEEKOFYEAR(data)=WEEKOFYEAR(NOW()) AND YEAR(data)=YEAR(NOW())");
  $prazosDaSemana = $prazosDaSemana->num_rows;

  $prazosDaSemanaCumpridos = $conexao->query("SELECT * FROM prazos WHERE WEEKOFYEAR(data)=WEEKOFYEAR(NOW()) AND YEAR(data)=YEAR(NOW()) AND status!=0");
  $prazosDaSemanaCumpridos = $prazosDaSemanaCumpridos->num_rows;

  $meusPrazosDaSemana = $conexao->query("SELECT * FROM prazos p INNER JOIN prazosUsuarios pu ON p.id=pu.idPrazo WHERE WEEKOFYEAR(p.data)=WEEKOFYEAR(NOW()) AND YEAR(p.data)=YEAR(NOW()) AND pu.idUsuario='".$_SESSION['cod']."'");
  $meusPrazosDaSemana = $meusPrazosDaSemana->num_rows;

  $audienciasDaSemana = $conexao->query("SELECT * FROM audiencias WHERE WEEKOFYEAR(datahora)=WEEKOFYEAR(NOW()) AND YEAR(datahora)=YEAR(NOW())");
  $audienciasDaSemana = $audienciasDaSemana->num_rows;

  $minhasAudienciasDaSemana = $conexao->query("SELECT * FROM audiencias a INNER JOIN audienciasUsuarios au ON a.id=au.idAudiencia WHERE WEEKOFYEAR(a.datahora)=WEEKOFYEAR(NOW()) AND au.idUsuario='".$_SESSION['cod']."'");
  $minhasAudienciasDaSemana = $minhasAudienciasDaSemana->num_rows;
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
        <!-- Start info box -->
        <div class="row top-summary">
          <div class="col-sm-4">
            <a href="visualizar-prazos.php?data=<?=date("Y-m-d");?>">
              <div class="widget green-1 animated fadeInDown">
                <div class="widget-content padding">
                  <div class="widget-icon">
                    <i class="fa fa-calendar"></i>
                  </div>
                  <div class="text-box">
                    <p class="maindata">PRAZOS <b>DE HOJE</b></p>
                    <h2><span class="animate-number" data-value="<?=$prazosDeHoje;?>" data-duration="3000">0</span></h2>
                    <div class="clearfix"></div>
                  </div>
                </div>
                <div class="widget-footer">
                  <div class="row">
                    <div class="col-sm-12">
                      <b><span class="animate-number" data-value="<?=$prazosDeHojeCumpridos;?>" data-duration="3000">0</span></b> prazo(s) cumprido(s)
                    </div>
                  </div>
                  <div class="clearfix"></div>
                </div>
              </div>
            </a>
          </div>

          <div class="col-sm-4">
            <a href="visualizar-prazos.php?data=<?=date("Y-m-d");?>&semana=true">
              <div class="widget darkblue-2 animated fadeInDown">
                <div class="widget-content padding">
                  <div class="widget-icon">
                    <i class="icon-globe-inv"></i>
                  </div>
                  <div class="text-box">
                    <p class="maindata">PRAZOS <b>DA SEMANA</b></p>
                    <h2><span class="animate-number" data-value="<?=$prazosDaSemana;?>" data-duration="3000">0</span></h2>

                    <div class="clearfix"></div>
                  </div>
                </div>
                <div class="widget-footer">
                  <div class="row">
                    <div class="col-sm-12">
                      <b><span class="animate-number" data-value="<?=$prazosDaSemanaCumpridos;?>" data-duration="3000">0</span></b> prazo(s) cumprido(s)
                    </div>
                  </div>
                  <div class="clearfix"></div>
                </div>
              </div>
            </a>
          </div>

          <div class="col-sm-4">
            <a href="audiencias.php">
              <div class="widget orange-4 animated fadeInDown">
                <div class="widget-content padding">
                  <div class="widget-icon">
                    <i class="fa fa-gavel"></i>
                  </div>
                  <div class="text-box">
                    <p class="maindata">AUDIÊNCIAS <b>NA SEMANA</b></p>
                    <h2><span class="animate-number" data-value="<?=$audienciasDaSemana;?>" data-duration="1500">0</span></h2>
                    <div class="clearfix"></div>
                  </div>
                </div>
                <div class="widget-footer">
                  <div class="row">
                    <div class="col-sm-12">
                      você tem <b><span class="animate-number" data-value="<?=$minhasAudienciasDaSemana;?>" data-duration="1500">0</span></b> audiência(s) esta semana
                    </div>
                  </div>
                  <div class="clearfix"></div>
                </div>
              </div>
            </a>
          </div>

        </div>
        <!-- End of info box -->

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
  var timer;

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