  <script>
    var resizefunc = [];
  </script>
  <!-- jQuery (necessary for Bootstrap's JavaScript plugins) -->
  <script src="assets/libs/jquery/jquery-1.11.1.min.js"></script>
  <script src="assets/libs/moment/moment-with-locales.js"></script>
  <script src="assets/libs/bootstrap/js/bootstrap.min.js"></script>
  <script src="assets/libs/jqueryui/jquery-ui-1.10.4.custom.min.js"></script>
  <script src="assets/libs/jquery-ui-touch/jquery.ui.touch-punch.min.js"></script>
  <script src="assets/libs/jquery-detectmobile/detect.js"></script>
  <script src="assets/libs/jquery-animate-numbers/jquery.animateNumbers.js"></script>
  <script src="assets/libs/ios7-switch/ios7.switch.js"></script>
  <script src="assets/libs/fastclick/fastclick.js"></script>
  <script src="assets/libs/jquery-blockui/jquery.blockUI.js"></script>
  <script src="assets/libs/bootstrap-bootbox/bootbox.min.js"></script>
  <script src="assets/libs/jquery-slimscroll/jquery.slimscroll.js"></script>
  <script src="assets/libs/jquery-sparkline/jquery-sparkline.js"></script>
  <script src="assets/libs/nifty-modal/js/classie.js"></script>
  <script src="assets/libs/nifty-modal/js/modalEffects.js"></script>
  <script src="assets/libs/sortable/sortable.min.js"></script>
  <script src="assets/libs/bootstrap-fileinput/bootstrap.file-input.js"></script>
  <script src="assets/libs/bootstrap-select/bootstrap-select.min.js"></script>
  <script src="assets/libs/bootstrap-select2/select2.min.js"></script>
  <script src="assets/libs/magnific-popup/jquery.magnific-popup.min.js"></script>
  <script src="assets/libs/pace/pace.min.js"></script>
  <script src="assets/libs/bootstrap-datepicker/js/bootstrap-datepicker.js"></script>
  <script src="assets/libs/jquery-icheck/icheck.min.js"></script>

  <!-- Demo Specific JS Libraries -->
  <script src="assets/libs/prettify/prettify.js"></script>
  
  <script src="assets/js/init.js"></script>

  <!-- Page Specific JS Libraries -->
  <script src="assets/libs/jquery-notifyjs/notify.min.js"></script>
  <script src="assets/libs/jquery-notifyjs/styles/metro/notify-metro.js"></script>
  <script src="assets/libs/bootstrap-calendar/js/bic_calendar.min.js"></script>
  <script src="assets/libs/fullcalendar/fullcalendar.min.js"></script>
  <script src="assets/libs/mixitup/jquery.mixitup.js"></script>
  <script src="assets/libs/bootstrap-datetimepicker/js/bootstrap-datetimepicker.js"></script>
  <script src="assets/libs/bootstrap-inputmask/inputmask.js"></script>
  <script src="assets/libs/jquery-datatables/js/jquery.dataTables.min.js"></script>
  <script src="assets/libs/jquery-datatables/js/dataTables.bootstrap.js"></script>
  <script src="assets/libs/jquery-datatables/extensions/TableTools/js/dataTables.tableTools.min.js"></script>
  
  <?
    $verfPrazos = $conexao->query("SELECT * FROM prazos WHERE data <= CURDATE() AND status = 0");
    if(date("H") >= 17 && $verfPrazos && $verfPrazos->num_rows > 0) {
  ?>
  <script type="text/javascript">
  $(document).ready(function() {
    $('.alerta-prazos').removeClass('hidden');
    setInterval(function() {
      $('.alerta-prazos a').animate( { color: '#ffffff' }, 1000).animate( { color: '#a94442' }, 1000); 
    }, 2500);
  });
  </script>
  <? } ?>