<? 
  include_once("include/configuracoes.php");
  include_once("include/funcoes.php");
  include_once("include/seguranca.php");

  if(isset($_GET['id'])) { $title = "Editar Contato"; } else { $title = "Cadastrar novo Contato"; }
  include_once("include/header.php");

  $conexao = new mysqli(SERVIDOR, USUARIO, SENHA, BANCO);
  if($conexao->connect_error) {
    die("Connect Error (".$conexao->connect_errno.")".$conexao->connect_error);
  }
  $conexao->query("SET CHARACTER SET utf8");
  $conexao->query("SET NAMES 'utf8'");

  $seguranca = new seguranca;
  $seguranca->verificarLogin();

  if(isset($_GET['id'])) {
    $id = $conexao->real_escape_string($_GET['id']);

    if(isset($_POST['submitContato'])) {
      $nome       = $conexao->real_escape_string($_POST['nome']);
      $telefone   = $conexao->real_escape_string($_POST['telefone']);
      $celular    = $conexao->real_escape_string($_POST['celular']);
      $email      = $conexao->real_escape_string($_POST['email']);
      $endereco   = $conexao->real_escape_string($_POST['endereco']);
      $nascimento = formataDataSQL($conexao->real_escape_string($_POST['nascimento']));
      
      $sqlContato = $conexao->query("UPDATE agenda SET nome='".$nome."', telefone='".$telefone."', celular='".$celular."', email='".$email."', endereco='".$endereco."', nascimento='".$nascimento."' WHERE id='".$id."'");
      if($sqlContato) {
        $_SESSION['retorno'] = "ok-atualizar";
      } else {
        $_SESSION['retorno'] = "erro-atualizar";
      }
      redireciona(URL_SISTEMA."adm-form-agenda.php?id=".$id);
    }

    if(isset($_GET['acao']) && $_GET['acao'] == "excluir") {
      $sqlContato = $conexao->query("DELETE FROM agenda WHERE id='".$id."'");
      if($sqlContato && $conexao->affected_rows > 0) {
        $_SESSION['retorno'] = "ok-excluir";
        redireciona(URL_SISTEMA."adm-list-agenda.php");
      } else {
        $_SESSION['retorno'] = "erro-excluir";
        redireciona(URL_SISTEMA."adm-form-agenda.php?id=".$id);
      }
    }

    $verfAgenda = $conexao->query("SELECT * FROM agenda WHERE id='".$id."'");
    if($verfAgenda && $verfAgenda->num_rows > 0) {
      $dadosA = $verfAgenda->fetch_array(MYSQLI_ASSOC);
      foreach($dadosA as $chave => $valor) {
        $$chave = $valor;
      }
    } else {
      $_SESSION['retorno'] = "erro-inexistente";
      redireciona(URL_SISTEMA."adm-list-agenda.php");
    }
  } else {
    if(isset($_POST['submitContato'])) {
      $nome       = $conexao->real_escape_string($_POST['nome']);
      $telefone   = $conexao->real_escape_string($_POST['telefone']);
      $celular    = $conexao->real_escape_string($_POST['celular']);
      $email      = $conexao->real_escape_string($_POST['email']);
      $endereco   = $conexao->real_escape_string($_POST['endereco']);
      $nascimento = formataDataSQL($conexao->real_escape_string($_POST['nascimento']));
      
      $sqlContato = $conexao->query("INSERT INTO agenda (nome, telefone, celular, email, endereco, nascimento) VALUE ('".$nome."', '".$telefone."', '".$celular."', '".$email."', '".$endereco."', '".$nascimento."')");
      if($sqlContato && $conexao->affected_rows > 0) {
        $idContato = $conexao->insert_id;

        $_SESSION['retorno'] = "ok-cadastrar";
        redireciona(URL_SISTEMA."adm-form-agenda.php?id=".$idContato);
      } else {
        $_SESSION['retorno'] = "erro-cadastrar";
        redireciona(URL_SISTEMA."adm-list-agenda.php");
      }
    }
  }

  if(isset($_SESSION['retorno'])) {
    if($_SESSION['retorno'] == "ok-atualizar") {
      $titulo   = "Sucesso";
      $mensagem = "O contato foi atualizado com sucesso!";
      $classe   = "success";
      $icone    = "fa-thumbs-up";
    } elseif($_SESSION['retorno'] == "erro-atualizar") {
      $titulo   = "Erro";
      $mensagem = "Ocorreu um erro ao atualizar o contato! Por favor tente novamente!";
      $classe   = "error";
      $icone    = "fa-warning";
    } elseif($_SESSION['retorno'] == "ok-cadastrar") {
      $titulo   = "Sucesso";
      $mensagem = "O contato foi cadastrado com sucesso!";
      $classe   = "success";
      $icone    = "fa-thumbs-up";
    } elseif($_SESSION['retorno'] == "erro-cadastrar") {
      $titulo   = "Erro";
      $mensagem = "Ocorreu um erro ao cadastrar o contato! Por favor tente novamente!";
      $classe   = "error";
      $icone    = "fa-warning";
    } elseif($_SESSION['retorno'] == "erro-excluir") {
      $titulo   = "Erro";
      $mensagem = "Ocorreu um erro ao excluir o contato! Por favor tente novamente!";
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
          <form action="adm-form-agenda.php<?=isset($id)?"?id=".$id:"";?>" method="POST" role="form">
            <div class="col-sm-12">
              <div class="widget shadow-widget">
                <div class="widget-header transparent">
                  <h2><?=str_replace("Contato", "<strong>Contato</strong>", $title);?></h2>
                </div>
                <div class="widget-content padding">
                  <div class="form-group">
                    <label>Nome</label>
                    <input type="text" name="nome" class="form-control" placeholder="Nome" value="<?=(isset($nome))?$nome:"";?>">
                  </div>
                  <div class="row">
                    <div class="col-sm-3">
                      <div class="form-group">
                        <label>Telefone</label>
                        <input type="text" name="telefone" class="form-control" placeholder="Telefone" value="<?=(isset($telefone))?$telefone:"";?>">
                      </div>
                    </div>
                    <div class="col-sm-3">
                      <div class="form-group">
                        <label>Celular</label>
                        <input type="text" name="celular" class="form-control" placeholder="Celular" value="<?=(isset($celular))?$celular:"";?>">
                      </div>
                    </div>
                    <div class="col-sm-3">
                      <div class="form-group">
                        <label>E-mail</label>
                        <input type="text" name="email" class="form-control" placeholder="E-mail" value="<?=(isset($email))?$email:"";?>">
                      </div>
                    </div>
                    <div class="col-sm-3">
                      <div class="form-group">
                        <label>Data de Nascimento</label>
                        <input type="text" name="nascimento" class="form-control data" data-mask="99/99/9999" placeholder="Data de Nascimento" value="<?=(isset($nascimento))?formataDataBR($nascimento):"";?>">
                      </div>
                    </div>
                  </div>
                  <div class="clearfix"></div>
                  <div class="form-group">
                    <label>Endereço</label>
                    <input type="text" name="endereco" class="form-control" placeholder="Endereço" value="<?=(isset($endereco))?$endereco:"";?>">
                  </div>                
                  <button type="submit" name="submitContato" class="btn btn-block btn-success">Salvar Contato</button>
                  <? if(isset($_GET['id'])) { ?>
                  <a href="adm-form-agenda.php?id=<?=$id;?>&acao=excluir" onclick="javascript:return confirm('Você tem certeza que deseja excluir este contato?');" class="btn btn-block btn-danger">Excluir Contato</a>
                  <? } ?>
                </div>
              </div>
            </div>
          </form>

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

    $('.data').datetimepicker({ locale: 'pt-BR', format: 'DD/MM/YYYY', keepOpen: true });    
  });
  </script>
</body>
</html>