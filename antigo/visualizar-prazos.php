<? 
  include_once("include/configuracoes.php");
  include_once("include/funcoes.php");
  include_once("include/seguranca.php");

  $data = isset($_GET['data'])?$_GET['data']:"";

  $title = "Visualizar prazos do dia ".formataDataBr($data);
  include_once("include/header.php");

  $conexao = new mysqli(SERVIDOR, USUARIO, SENHA, BANCO);
  if($conexao->connect_error) {
    die("Connect Error (".$conexao->connect_errno.")".$conexao->connect_error);
  }
  $conexao->query("SET CHARACTER SET utf8");
  $conexao->query("SET NAMES 'utf8'");

  $seguranca = new seguranca;
  $seguranca->verificarLogin();

  if(isset($_GET['data']) && !empty($_GET['data']) && dataValida($_GET['data'])) {
    $data = $conexao->real_escape_string($_GET['data']);
    $sentencaPesquisa = "p.data='".$data."'";

    if(isset($_GET['semana']) && !empty($_GET['semana'])) {
      $sentencaPesquisa = "WEEK(p.data)=WEEK('".$data."') AND YEAR(p.data)=YEAR('".$data."')";
    }
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
          <div class="col-xs-12">
            <h1 class="text-center">
              <?=formataDataBr($data);?>
              <? if(!isset($_GET['semana'])) { ?>
              <div class="dropdown pull-right">
                <a href="javascript:;" title="Versão para impressão" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"><i class="fa fa-print"></i></a>
                <ul class="dropdown-menu">
                  <li><a href="javascript: w=window.open('visualizar-prazos-impressao.php?data=<?=$data;?>'); w.print();">Todos</a></li>
                  <li><a href="javascript: w=window.open('visualizar-prazos-impressao.php?data=<?=$data;?>&tipo=administrativo'); w.print();">Administrativo</a></li>
                  <li><a href="javascript: w=window.open('visualizar-prazos-impressao.php?data=<?=$data;?>&tipo=trabalhista'); w.print();">Trabalhista</a></li>
                  <li><a href="javascript: w=window.open('visualizar-prazos-impressao.php?data=<?=$data;?>&tipo=civel'); w.print();">Cível</a></li>
                </ul>
              </div>
              <? } ?>
            </h1>
            <br/>
            <ul class="col-xs-12 text-center filtroMixItUp">
              <li class="filter" data-filter="all">Mostrar todos</li>
              <li class="divider"></li>
              <li class="filter fAdministrativo" data-filter=".administrativo">Administrativo</li>
              <li class="filter fTrabalhista" data-filter=".trabalhista">Trabalhista</li>
              <li class="filter fCivel" data-filter=".civil">Cível</li>
              <li class="divider"></li>
              <li class="filter fCumprido" data-filter=".cumprido">Cumprido</li>
              <li class="filter fNaoCumprido" data-filter=".nao-cumprido">Não Cumprido</li>
              <li class="divider"></li>
              <li class="filter fMeuPrazo" data-filter=".meu-prazo">Meus prazos</li>
            </ul>
            <? if(isset($_GET['semana']) && !empty($_GET['semana'])) { ?>
            <ul class="col-xs-12 text-center filtroMixItUp">
              <?
                $datasPrazos = $conexao->query("SELECT p.*, CONCAT(u.nome, ' ', u.sobrenome) as usuario FROM prazos p LEFT JOIN usuarios u ON p.status=u.id WHERE ".$sentencaPesquisa." GROUP BY data ORDER BY data");
                while($dadosDP = $datasPrazos->fetch_array()) {
              ?>
              <li class="filter data" data-filter=".<?=$dadosDP['data'];?>"><?=formataDataBr($dadosDP['data']);?></li>
              <?
                }
              ?>
            </ul>
            <? } ?>
            <div id="prazos">
              <?
                $prazos = $conexao->query("SELECT p.*, CONCAT(u.nome, ' ', u.sobrenome) as usuario FROM prazos p LEFT JOIN usuarios u ON p.status=u.id WHERE ".$sentencaPesquisa." ORDER BY prazo ASC, FIELD(tipo,'administrativo','civil','trabalhista')");
                while($dadosP = $prazos->fetch_array()) {
                  $classe = "";

                  if($dadosP['tipo'] == 'administrativo') { $classe = "green-1"; }
                  elseif($dadosP['tipo'] == 'trabalhista') { $classe = "azul-1"; }
                  elseif($dadosP['tipo'] == 'civil') { $classe = "darkblue-2"; }

                  if($dadosP['status'] != 0) { 
                    $classe = "red-1 cumprido"; 
                    if($dadosP['data_cumprido'] != "0000-00-00") { $dataCumprido = formataDataBr($dadosP['data_cumprido']); }
                    if($dadosP['datahoracumprido'] != "0000-00-00 00:00:00") { $dataCumprido = formataDataHoraBr($dadosP['datahoracumprido']); }
                    if(!isset($dataCumprido)) { $dataCumprido = formataDataHoraBr($dadosP['datahoracumprido']); }

                    $cumprido = "Prazo cumprido por ".$dadosP['usuario']." em ".$dataCumprido;
                  } else { 
                    $classe .= " nao-cumprido"; 
                    $cumprido = ""; 
                  }

                  $advogados = $idAdvogados = array();
                  $prazosUsu = $conexao->query("SELECT u.id, u.nome, u.sobrenome FROM prazosUsuarios pu INNER JOIN usuarios u ON pu.idUsuario=u.id WHERE pu.idPrazo='".$dadosP['id']."'");
                  while($dadosPU = $prazosUsu->fetch_array(MYSQLI_ASSOC)) {
                    $id               = $dadosPU['id'];

                    $idAdvogados[$id] = $id;
                    $advogados[]      = $dadosPU['nome']." ".$dadosPU['sobrenome'];
                  }
                  if(in_array($_SESSION['cod'], $idAdvogados)) { $classe .= " meu-prazo"; }
                  $advogados = implode(", ", $advogados);
              ?>
              <div class="col-xs-12 mix no-padding <?=$classe." ".$dadosP['tipo']." ".$dadosP['data'];?>">
                <div class="widget <?=$classe." ".$dadosP['tipo']." ".$dadosP['data'];?>">
                  <div class="widget-header">
                    <h2 class="col-xs-11"><strong><?=$dadosP['prazo'];?> - <?=formataDataBr($data);?><br/><?=$cumprido;?></strong></h2>
                    <div class="additional-btn">
                      <!--
                      <div class="hidden-xs hidden-sm">
                        <a href="javascript: w=window.open('visualizar-prazos-impressao.php?id=<?=$dadosP['id'];?>'); w.print();" class="ativo imprimirPrazo"><i class="icon-print"></i> Imprimir Prazo</a>
                        <? if($dadosP['status'] == 0) { ?><a href="javascript:;" data-id="<?=$dadosP['id'];?>" class="ativo cumprir"><i class="icon-check-1"></i> Cumprir Prazo</a><? } ?>
                        <? if($dadosP['status'] != 0 && $_SESSION['grupo'] == "admin") { ?><a href="javascript:;" data-id="<?=$dadosP['id'];?>" class="ativo descumprir"><i class="icon-cancel-3"></i> Descumprir Prazo</a><? } ?>
                        <? if($_SESSION['grupo'] == "admin") { ?><a href="adm-form-prazos.php?id=<?=$dadosP['id'];?>" class="ativo"><i class="icon-edit"></i> Editar</a><? } ?>
                        <a href="#" class="ativo widget-toggle"><i class="icon-down-open-2"></i> Minimizar</a>
                        <? if($_SESSION['grupo'] == "admin" && $dadosP['status'] == 0) { ?><a href="javascript:;" data-id="<?=$dadosP['id'];?>" class="excluir fechar last"><i class="icon-cancel-3"></i> Excluir</a><? } ?>
                      </div>
                      <div class="visible-xs visible-sm"> -->
                      <div>
                        <div class="btn-group">
                          <button type="button" class="btn btn-danger dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                            <i class="fa fa-cog"></i> Ações <span class="caret"></span>
                          </button>
                          <ul class="dropdown-menu pull-right danger" role="menu">
                            <li><a href="javascript: w=window.open('visualizar-prazos-impressao.php?id=<?=$dadosP['id'];?>'); w.print();" class="ativo imprimirPrazo"><i class="icon-print"></i> Imprimir Prazo</a></li>
                            <? if($dadosP['status'] == 0) { ?><li><a href="javascript:;" data-id="<?=$dadosP['id'];?>" class="ativo cumprir"><i class="icon-check-1"></i> Cumprir Prazo</a></li><? } ?>
                            <? if($dadosP['status'] != 0 && $_SESSION['grupo'] == "admin") { ?><li><a href="javascript:;" data-id="<?=$dadosP['id'];?>" class="ativo descumprir"><i class="icon-cancel-3"></i> Descumprir Prazo</a></li><? } ?>
                            <? if($_SESSION['grupo'] == "admin") { ?><li><a href="adm-form-prazos.php?id=<?=$dadosP['id'];?>" class="ativo"><i class="icon-edit"></i> Editar</a></li><? } ?>
                            <li><a href="#" class="ativo widget-toggle"><i class="icon-down-open-2"></i> Minimizar</a></li>
                            <? if($_SESSION['grupo'] == "admin" && $dadosP['status'] == 0) { ?><li><a href="javascript:;" data-id="<?=$dadosP['id'];?>" class="excluir"><i class="icon-cancel-3"></i> Excluir</a></li><? } ?>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="widget-content padding">
                    <? if(!empty($advogados) && strlen($advogados) > 0) { ?>
                    <p><strong>Advogados:</strong><br/><?=$advogados;?></p>
                    <hr/>
                    <? } ?>
                    <? if(!empty($dadosP['observacao']) && strlen($dadosP['observacao']) > 0) { ?>
                    <p><strong>Observação:</strong><br/><?=nl2br(trim($dadosP['observacao']));?></p>
                    <hr/>
                    <? } ?>
                    <? if(!empty($dadosP['conteudo']) && strlen($dadosP['conteudo']) > 0) { ?>
                    <p><strong>Descrição:</strong><br/><?=nl2br(trim($dadosP['conteudo']));?></p>
                    <? } ?>
                  </div>
                </div>
              </div>
              <?
                }
              ?>
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
    $('#prazos').mixItUp();

    $('#prazos .additional-btn').on('shown.bs.dropdown', function () {
      $(this).toggleClass('active');
    }).on('hidden.bs.dropdown', function () {
      $(this).toggleClass('active');
    });

    $('.fAdministrativo').append(" ("+$('#prazos .mix.administrativo').length+")");
    $('.fTrabalhista').append(" ("+$('#prazos .mix.trabalhista').length+")");
    $('.fCivel').append(" ("+$('#prazos .mix.civil').length+")");

    $('.fCumprido').append(" ("+$('#prazos .mix.cumprido').length+")");
    $('.fNaoCumprido').append(" ("+$('#prazos .mix.nao-cumprido').length+")");

    $('.fMeuPrazo').append(" ("+$('#prazos .mix.meu-prazo').length+")");

    <? if($_SESSION['grupo'] == "admin") { ?>
    $('.excluir').click(function() {
      elemento = $(this).parent().parent().parent().parent().parent();

      if(confirm("Você tem certeza que deseja excluir este prazo?")) {
        $.ajax({ type:'POST', url:'acoes-prazos.php', data: { acao:'excluir', id:$(this).data('id') } }).done(function(retorno){
          if(retorno == "ok") {
            elemento.remove();
            $.notify({
                title: 'Sucesso',
                text: 'O prazo foi excluído com sucesso!',
                image: "<i class='fa fa-thumbs-up'></i>"
            }, {
                style: 'metro',
                className: 'success',
                globalPosition: 'top right',
                showAnimation: "show",
                showDuration: 0,
                hideDuration: 0,
                autoHideDelay: 5000,
                autoHide: true,
                clickToHide: true
            });
          } else {
            $.notify({
                title: 'Erro',
                text: 'Ocorreu um erro ao excluir o prazo! Por favor tente novamente!',
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
          }
          console.log(retorno);
        });
      }
    });

    $('.descumprir').click(function() {
      elemento = $(this).parent().parent().parent().parent().parent();

      if(elemento.hasClass('administrativo')) { nClasse = "green-1"; }
      else if(elemento.hasClass('trabalhista')) { nClasse = "azul-1"; }
      else if(elemento.hasClass('civil')) { nClasse = "darkblue-2"; }

      $.ajax({ type:'POST', url:'acoes-prazos.php', data: { acao:'descumprir', id:$(this).data('id') } }).done(function(retorno){
        if(retorno == "ok") {
          $.notify({
              title: 'Sucesso',
              text: 'O prazo foi descumprido com sucesso! Atualize a página!',
              image: "<i class='fa fa-thumbs-up'></i>"
          }, {
              style: 'metro',
              className: 'success',
              globalPosition: 'top right',
              showAnimation: "show",
              showDuration: 0,
              hideDuration: 0,
              autoHideDelay: 5000,
              autoHide: true,
              clickToHide: true
          });
          // elemento.removeClass('cumprido').addClass('nao-cumprido').removeClass('red-1').addClass(nClasse);
          // elemento.find('.cumprido').removeClass('cumprido').addClass('nao-cumprido').removeClass('red-1').addClass(nClasse);
        } else {
          $.notify({
              title: 'Erro',
              text: 'Ocorreu um erro ao descumprir o prazo! Por favor tente novamente!',
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

        }
        console.log(retorno);
      });
    });
    <? } ?>

    $('.cumprir').click(function() {
      elemento = $(this).parent().parent().parent().parent().parent();

      if(elemento.hasClass('administrativo')) { nClasse = "green-1"; }
      else if(elemento.hasClass('trabalhista')) { nClasse = "azul-1"; }
      else if(elemento.hasClass('civil')) { nClasse = "darkblue-2"; }

      $.ajax({ type:'POST', url:'acoes-prazos.php', data: { acao:'cumprir', id:$(this).data('id') } }).done(function(retorno){
        if(retorno == "ok") {
          $.notify({
              title: 'Sucesso',
              text: 'O prazo foi cumprido com sucesso! Atualize a página!',
              image: "<i class='fa fa-thumbs-up'></i>"
          }, {
              style: 'metro',
              className: 'success',
              globalPosition: 'top right',
              showAnimation: "show",
              showDuration: 0,
              hideDuration: 0,
              autoHideDelay: 5000,
              autoHide: true,
              clickToHide: true
          });
          // elemento.removeClass('nao-cumprido').addClass('cumprido').removeClass(nClasse).addClass('red-1');
          // elemento.find('.cumprido').removeClass('nao-cumprido').addClass('cumprido').removeClass(nClasse).addClass('red-1');
        } else {
          $.notify({
              title: 'Erro',
              text: 'Ocorreu um erro ao cumprir o prazo! Por favor tente novamente!',
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
        }
        console.log(retorno);
      });
    });
  });
  </script>
</body>
</html>