    <!-- Top Bar Start -->
    <div class="topbar">
      <div class="topbar-left">
        <div class="logo">
          
        </div>
        <button class="button-menu-mobile open-left">
          <i class="fa fa-bars"></i>
        </button>
      </div>
      <!-- Button mobile view to collapse sidebar menu -->
      <div class="navbar navbar-default" role="navigation">
        <div class="container">
          <div class="navbar-collapse2">
            <ul class="nav navbar-nav navbar-right top-navbar">
              <li class="dropdown hidden alerta-prazos"><a href="visualizar-prazos.php?data=<?=date("Y-m-d");?>" class="text-danger" title="">Atenção! Existem prazos em aberto! <i class="fa fa-warning"></i></a></li>
              <li class="dropdown iconify hide-phone"><a href="#" onclick="javascript:toggle_fullscreen()"><i class="icon-resize-full-2"></i></a></li>
              <li class="dropdown topbar-profile">
                <a href="#" class="dropdown-toggle" data-toggle="dropdown"><?=$_SESSION['nome'];?> <i class="fa fa-caret-down"></i></a>
                <ul class="dropdown-menu">
                  <li><a href="alterar-dados.php">Alterar Dados</a></li>
                  <li class="divider"></li>
                  <li><a class="md-trigger" data-modal="logout-modal"><i class="icon-logout-1"></i> Sair</a></li>
                </ul>
              </li>
            </ul>
          </div>
          <!--/.nav-collapse -->
        </div>
      </div>
    </div>
    <!-- Top Bar End -->