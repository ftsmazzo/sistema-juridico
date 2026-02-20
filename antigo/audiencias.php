<? 
  include_once("include/configuracoes.php");
  include_once("include/funcoes.php");
  include_once("include/seguranca.php");

  $title = "Audiências";
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
          <div class="col-md-12">
            <div class="widget">
              <div class="widget-content padding">
                <div class="col-md-12">
                  <div class="widget bg-white">
                    <div class="widget-body">
                      <div class="row">
                        <div class="col-md-12 col-sm-12 col-xs-12">
                          <div id="calendar"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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

  <div id="destalheAudiencia" class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">

        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
          <h4 class="modal-title">Número do processo: <span id="numprocesso"></span></h4>
        </div>
        <div class="modal-body">
          <div class="col-md-6 text-center">
            <h5><strong>Vara:</strong></h5> <span id="vara"></span>
          </div>
          <div class="col-md-6 text-center">
            <h5><strong>Local:</strong></h5> <span id="local"></span>
          </div>
          <div class="clearfix"></div>
          <div class="col-md-6 text-center">
            <br/>
            <h5><strong>Reclamante:</strong></h5> <span id="reclamante"></span>
          </div>
          <div class="col-md-6 text-center">
            <br/>
            <h5><strong>Reclamado:</strong></h5> <span id="reclamado"></span>
          </div>
          <div class="clearfix"></div>
          <div class="col-md-6 text-center">
            <br/>
            <h5><strong>Preposto:</strong></h5> <span id="preposto"></span>
          </div>
          <div class="col-md-6 text-center">
            <br/>
            <h5><strong>Advogados:</strong></h5> <span id="advogados"></span>
          </div>
          <div class="clearfix"></div>
          <div class="col-md-12 text-center">
            <br/>
            <h5><strong>Observações:</strong></h5> <span id="observacao"></span>
          </div>
          <div class="clearfix"></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-default" data-dismiss="modal">Fechar</button>
        </div>

      </div>
    </div>
  </div>

  <!-- the overlay modal element -->
  <div class="md-overlay"></div>
  <!-- End of eoverlay modal -->
  <? include_once("include/scripts.php"); ?>

  <script type="text/javascript">
  $(document).ready(function(){
    var audiencias = [
      <?
        $audiencias = $conexao->query("SELECT * FROM audiencias");
        while($dadosA = $audiencias->fetch_array(MYSQLI_ASSOC)) {
          $titulo = "Processo nº: ".$dadosA['numprocesso']."|~|Partes:".$dadosA['reclamado']." x ".$dadosA['reclamante']."|~|Preposto:".$dadosA['preposto'];

          $advogados = $idAdvogados = array();
          $audienciaUsu = $conexao->query("SELECT u.id, u.nome, u.sobrenome FROM audienciasUsuarios au INNER JOIN usuarios u ON au.idUsuario=u.id WHERE au.idAudiencia='".$dadosA['id']."'");
          while($dadosAU = $audienciaUsu->fetch_array(MYSQLI_ASSOC)) {
            $id               = $dadosAU['id'];

            $idAdvogados[$id] = $id;
            $advogados[]      = $dadosAU['nome']." ".$dadosAU['sobrenome'];
          }
          if(in_array($_SESSION['cod'], $idAdvogados)) { $classe = "minha-audiencia"; } else { $classe = ""; }
          $advogados = implode(", ", $advogados);
      ?>
      { id:'<?=$dadosA["id"];?>', title:'<?=str_replace(array("\n", "\r"), "", $titulo);?>', processo:'<?=str_replace(array("\n", "\r"), "", $dadosA["numprocesso"]);?>', vara:'<?=str_replace(array("\n", "\r"), "", $dadosA["vara"]);?>', local:'<?=str_replace(array("\n", "\r"), "", $dadosA["local"]);?>', reclamante:'<?=str_replace(array("\n", "\r"), "", $dadosA["reclamante"]);?>', reclamado:'<?=str_replace(array("\n", "\r"), "", $dadosA["reclamado"]);?>', observacao:'<?=str_replace(array("\n", "\r"), "", $dadosA["observacao"]);?>', advogados:'<?=str_replace(array("\n", "\r"), "", $advogados);?>', className:'<?=$classe;?>', start:'<?=str_replace(" ", "T", $dadosA["datahora"]);?>', allDay:false },
      <?
        }
      ?>
    ];

    $('#calendar').fullCalendar({
      header: {
        left: 'prev,next today',
        center: 'title',
        right: 'month,agendaWeek,agendaDay,print'
      },
      defaultView: 'agendaWeek',
      events: audiencias,
      minTime: 8,
      maxTime: 20,
      hiddenDays: [ 0, 6 ],
      businessHours: true,

      eventClick: function(event, jsEvent, view) {
        $('#numprocesso').html(event.processo);
        $('#vara').html(event.vara);
        $('#local').html(event.local);
        $('#reclamante').html(event.reclamante);
        $('#reclamado').html(event.reclamado);
        $('#advogados').html(event.advogados);
        $('#preposto').html(event.preposto);
        $('#observacao').html(event.observacao);
        $('#destalheAudiencia').modal();
      },      
      eventRender: function(event, element) { 
        element.find('.fc-event-time').remove();
        texto = element.find('.fc-event-title').html();
        element.find('.fc-event-title').html(texto.replace("|~|", "<br/>").replace("|~|", "<br/>")); 
      }, 

      monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'], 
      monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'], 
      dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'], 
      dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'], 
      buttonText: {   prev: '&nbsp;&#9668;&nbsp;',    next: '&nbsp;&#9658;&nbsp;',    prevYear: '&nbsp;&lt;&lt;&nbsp;',   nextYear: '&nbsp;&gt;&gt;&nbsp;',   today: 'hoje',  month: 'mês',   week: 'semana', day: 'dia'  },  
      titleFormat: {  month: 'MMMM yyyy', week: "d [ yyyy]{ '&#8212;'[ MMM] d MMM yyyy}", day: 'dddd, d MMM, yyyy'    },  
      columnFormat: { month: 'ddd',   week: 'ddd d/M',    day: 'dddd d/M' },  
      allDayText: 'dia todo', 
      axisFormat: 'H:mm', 
      timeFormat: {   '': 'H(:mm)',   agenda: 'H:mm{ - H:mm}' }
    });

    $('.fc-header-right .fc-corner-right').removeClass('fc-corner-right');
    $('.fc-header-right').append('<a class="fc-button fc-button-agendaDay fc-state-default fc-corner-right" href="javascript: w=window.open(\'audiencias-impressao.php?data=<?=date("Y-m-d");?>\'); w.print();" title="Versão para impressão"><i class="fa fa-print"></i></a>');

    $('.fc-button-prev, .fc-button-next').on('click', function() {
      var data = $('#calendar').fullCalendar('getDate');
      var d = new Date(data);

      if(d.getMonth()+1 < 10) { mes = "0"+(d.getMonth()+1); } else { mes = (d.getMonth()+1); }
      if(d.getDate() < 10) { dia = "0"+d.getDate(); } else { dia = d.getDate(); }

      var nData = d.getFullYear()+"-"+mes+"-"+dia;
      $('.fc-header-right a').attr('href', 'javascript: w=window.open(\'audiencias-impressao.php?data='+nData+'\'); w.print();');
    });
  });
  </script>
</body>
</html>