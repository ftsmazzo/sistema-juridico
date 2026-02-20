<? 
  include_once("include/configuracoes.php");
  include_once("include/funcoes.php");
  include_once("include/seguranca.php");

  $title = "Relatórios";
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
          <form action="adm-list-relatorios.php" method="POST" role="form">
            <div class="col-sm-12">
              <div class="widget shadow-widget">
                <div class="widget-header transparent">
                  <h2>Relatórios</h2>
                </div>
                <div class="widget-content padding">
                  <div class="row">
                    <div class="col-sm-6">
                      <div class="form-group">
                        <label>Advogado</label>
                        <select name="advogado" class="form-control">
                          <? 
                            $usuarios = $conexao->query("SELECT * FROM usuarios WHERE ativo=1 AND relatorio=1 ORDER BY nome");
                            while($dadosU = $usuarios->fetch_array(MYSQLI_ASSOC)) {
                          ?>
                          <option value="<?=$dadosU['id'];?>" <?=(isset($advogados) && in_array($dadosU['id'], $advogados))?"selected=\"selected\"":"";?>><?=$dadosU['nome'];?> <?=$dadosU['sobrenome'];?></option>
                          <?
                            }
                          ?>
                        </select>
                      </div>
                    </div>
                    <div class="col-sm-3">
                      <div class="form-group">
                        <label>Data Inicial</label>
                        <input type="text" name="datainicial" id="datainicial" class="form-control data" data-mask="99/99/9999" placeholder="Data Inicial">
                      </div>
                    </div>
                    <div class="col-sm-3">
                      <div class="form-group">
                        <label>Data Final</label>
                        <input type="text" name="datafinal" id="datafinal" class="form-control data" data-mask="99/99/9999" placeholder="Data Final">
                      </div>
                    </div>
                  </div>
                  <div class="clearfix"></div>
                  <div class="row">
                  </div>
                  <button type="submit" name="submitRelatorio" class="btn btn-block btn-success">Exibir Relatório</button>
                </div>
              </div>
            </div>
          </form>
        </div>
        <div class="clearfix"></div>
        <br/><br/><br/><br/><br/><br/>

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
    $('.data').datetimepicker({ locale: 'pt-BR', format: 'DD/MM/YYYY', daysOfWeekDisabled: [0, 6], keepOpen: false });

    $('#datainicial').on('dp.change', function(e) { $('#datafinal').data("DateTimePicker").minDate(e.date); });
    $('#datafinal').on('dp.change', function(e) { $('#datainicial').data("DateTimePicker").maxDate(e.date); });
  });
  </script>
</body>
</html>