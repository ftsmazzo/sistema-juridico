    <!-- Left Sidebar Start -->
    <div class="left side-menu">
      <div class="sidebar-inner slimscrollleft">
        <!-- Search form -->
        <form action="busca.php" method="POST" role="search" class="navbar-form">
          <div class="form-group">
            <input type="text" name="busca" placeholder="Pesquisar um prazo..." class="form-control">
            <button type="submit" class="btn search-button"><i class="fa fa-search"></i></button>
          </div>
        </form>
        <div class="clearfix"></div>
        <!--- Profile -->
        <div class="profile-info">
          <div class="profile-info-col col-xs-8 col-xs-offset-2">
            <img src="images/logo.png" class="img-responsive">
            <br/>
            <div class="profile-text">Seja bem vindo</div>
            <div class="profile-buttons text-center">
              <a href="index.php" class="open-right"><i class="fa fa-calendar"></i></a>
              <a href="alterar-dados.php" class="open-right"><i class="fa fa-edit"></i></a>
              <a class="md-trigger" data-modal="logout-modal" title="Sign Out"><i class="fa fa-power-off text-red-1"></i></a>
            </div>
          </div>
        </div>
        <!--- Divider -->
        <div class="clearfix"></div>
        <hr class="divider" />
        <div class="clearfix"></div>
        <!--- Divider -->
        <div id="sidebar-menu">
          <ul>
            <li><a href='index.php' class="<?=(verificaArquivo("index.php"))?"active":""?>"><i class='icon-home-3'></i><span>Tela Inicial</span></a></li>
            <li class='has_sub'>
              <a href='javascript:void(0);' class="<?=(verificaArquivo("agenda.php"))?"active":""?>"><i class='icon-phone'></i><span>Agenda</span> <span class="pull-right"><i class="fa fa-angle-down"></i></span></a>
              <ul>
                <li><a href='agenda.php' class="<?=(verificaArquivo("agenda.php"))?"active":""?>"><span>Visualizar</span></a></li>
                <li><a href='adm-form-agenda.php' class="<?=(verificaArquivo("adm-form-agenda.php"))?"active":""?>"><span>Adicionar Novo</span></a></li>
                <li><a href='adm-list-agenda.php' class="<?=(verificaArquivo("adm-list-agenda.php"))?"active":""?>"><span>Listar</span></a></li>
              </ul>
            </li>
            <li><a href='audiencias.php' class="<?=(verificaArquivo("audiencias.php"))?"active":""?>"><i class='fa fa-gavel'></i><span>Audiências</span></a></li>
            <li class='has_sub'>
              <a href='javascript:void(0);' class="<?=(verificaArquivo("outros-anos.php"))?"active":""?>"><i class='icon-calendar'></i><span>Outros anos</span> <span class="pull-right"><i class="fa fa-angle-down"></i></span></a>
              <ul>
                <?
                  $listarAnos = $conexao->query("SELECT YEAR(data) as ano FROM prazos GROUP BY YEAR(data) ORDER BY YEAR(data)");
                  while($dadosA = $listarAnos->fetch_array(MYSQLI_ASSOC)) {
                    if($dadosA['ano'] != 0) {
                ?>
                <li><a href="outros-anos.php?ano=<?=$dadosA['ano'];?>"><?=$dadosA['ano'];?></a></li>
                <?
                    }
                  }
                ?>
              </ul>
            </li>
            <li><a href='alterar-dados.php' class="<?=(verificaArquivo("alterar-dados.php"))?"active":""?>"><i class='icon-edit'></i><span>Alterar dados</span></a></li>
            <? if($_SESSION['grupo'] == "admin") { ?>
            <?
              $arqPrazos        = array("adm-form-prazos.php", "adm-list-prazos-data.php");
              $arqAudiencias    = array("adm-form-audiencias.php", "adm-list-audiencias.php");
              $arqUsuarios      = array("adm-form-usuarios.php", "adm-list-usuarios.php");
              $arqRelatorios    = array("adm-form-relatorios.php", "adm-list-relatorios.php");
              $arqAdministrador = array_merge($arqPrazos, $arqAudiencias, $arqUsuarios);
            ?>
            <li class='has_sub'>
              <a href='javascript:void(0);' class="<?=(verificaArquivo($arqAdministrador))?"active":""?>"><i class='fa fa-gears'></i><span>Painel do Administrador</span> <span class="pull-right"><i class="fa fa-angle-down"></i></span></a>
              <ul>
                <li class='has_sub'>
                  <a href='javascript:void(0);'><i class='fa fa-calendar'></i><span>Prazos</span> <span class="pull-right"><i class="fa fa-angle-down"></i></span></a>
                  <ul>
                    <li><a href='adm-form-prazos.php' class="<?=(verificaArquivo("adm-form-prazos.php"))?"active":""?>"><span>Adicionar Novo</span></a></li>
                    <li><a href='adm-list-prazos-data.php' class="<?=(verificaArquivo("adm-list-prazos-data.php"))?"active":""?>"><span>Listar</span></a></li>
                  </ul>
                </li>
                <li class='has_sub'>
                  <a href='javascript:void(0);' class="<?=(verificaArquivo($arqAudiencias))?"active":""?>"><i class='fa fa-gavel'></i><span>Audiências</span> <span class="pull-right"><i class="fa fa-angle-down"></i></span></a>
                  <ul>
                    <li><a href='adm-form-audiencias.php' class="<?=(verificaArquivo("adm-form-audiencias.php"))?"active":""?>"><span>Adicionar Nova</span></a></li>
                    <li><a href='adm-list-audiencias.php' class="<?=(verificaArquivo("adm-list-audiencias.php"))?"active":""?>"><span>Listar</span></a></li>
                  </ul>
                </li>
                <li class='has_sub'>
                  <a href='javascript:void(0);' class="<?=(verificaArquivo($arqUsuarios))?"active":""?>"><i class='fa fa-user'></i><span>Usuários</span> <span class="pull-right"><i class="fa fa-angle-down"></i></span></a>
                  <ul>
                    <li><a href='adm-form-usuarios.php' class="<?=(verificaArquivo("adm-form-usuarios.php"))?"active":""?>"><span>Adicionar Novo</span></a></li>
                    <li><a href='adm-list-usuarios.php' class="<?=(verificaArquivo("adm-list-usuarios.php"))?"active":""?>"><span>Listar</span></a></li>
                  </ul>
                </li>
                <li><a href='adm-form-relatorios.php' class="<?=(verificaArquivo($arqRelatorios))?"active":""?>"><i class='fa fa-bar-chart-o'></i> <span>Relatórios</span></a></li>
              </ul>
            </li>
            <? } ?>
          </ul>
          <div class="clearfix"></div>
        </div>
        <div class="clearfix"></div>
        <br>
      </div>
    </div>
    <!-- Left Sidebar End -->