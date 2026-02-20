<?
  function redireciona($url) {
    echo "<script type=\"text/javascript\">window.location.href='".$url."';</script>";
    die();
  }

  function montaCalendarioAno($ano) {
  	$calendario = "";
  	$calendario .= '<div class="bic_calendar"><table class="table header"><tbody><tr><td class="monthAndYear span6"><div class="visualyear">'.$ano.'</div></td></tr></tbody></table><div id="monthsLayer" class="row">';
                    
    for($i=1; $i<=12; $i++) {
      if($i == 1) { $calendario .= '<div clas="row">'; }
      $calendario .= montaCalendario($i, $ano);
      if($i%3 == 0) { $calendario .= '</div><div class="clearfix"></div><div clas="row">'; }
      if($i == 12) { $calendario .= '</div>'; }
    }
                    
    $calendario .= '</div></div>';

    return $calendario;
  }

  function montaCalendario($mes, $ano, $classe="") {
    $calendario = "";
    if(strlen($classe) > 0) { $classe .= "-"; }

    switch($mes){
      case 1:  $nMes = "Janeiro";   $n = 31; break;
      case 2:  $nMes = "Fevereiro"; $bi = $ano % 4; if($bi == 0){ $n = 29; } else { $n = 28; } break;
      case 3:  $nMes = "Março";     $n = 31; break;
      case 4:  $nMes = "Abril";     $n = 30; break;
      case 5:  $nMes = "Maio";      $n = 31; break;
      case 6:  $nMes = "Junho";     $n = 30; break;
      case 7:  $nMes = "Julho";     $n = 31; break;
      case 8:  $nMes = "Agosto";    $n = 31; break;
      case 9:  $nMes = "Setembro";  $n = 30; break;
      case 10: $nMes = "Outubro";   $n = 31; break;
      case 11: $nMes = "Novembro";  $n = 30; break;
      case 12: $nMes = "Dezembro";  $n = 31; break;
    }

    $pDiaMes = mktime(0,0,0,$mes,1,$ano);
    $dds = date('D', $pDiaMes);

    switch($dds){
      case "Sun": $branco = 0; break;
      case "Mon": $branco = 1; break;
      case "Tue": $branco = 2; break;
      case "Wed": $branco = 3; break;
      case "Thu": $branco = 4; break;
      case "Fri": $branco = 5; break;
      case "Sat": $branco = 6; break;
    }        

    $calendario .= '<div class="col-md-4"><div class="monthDisplayed"><div class="month">'.$nMes.'</div><table class="table"><tbody><tr class="days-month"><td class="primero">D</td><td>S</td><td>T</td><td>Q</td><td>Q</td><td>S</td><td class="ultimo">S</td></tr><tr>';
    $dt = 0;

    if($branco > 0){
      for($x = 0; $x < $branco; $x++){
        $calendario .= '<td class="branco">&nbsp;</td>';
        $dt++;
      }
    }

    $ndds = array("domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado");

    for($i = 1; $i <= $n; $i++ ){
      $calendario .= '<td class="'.$ndds[$dt].' '.$classe.$ano.'-'.str_pad($mes, 2, "0", STR_PAD_LEFT).'-'.str_pad($i, 2, "0", STR_PAD_LEFT).'">'.$i.'</td>';
      $dt++;

      if($dt > 6) {
	      $calendario .= '</tr><tr>';
	      $dt = 0;
      }

      if($i == $n && $dt < 6) {
      	for($dr=$dt; $dr<=6; $dr++) {
      		$calendario .= '<td class="branco">&nbsp;</td>';
      	}
      	$calendario .= '</tr>';
      }

    }

		$calendario .= '</tr></tbody></table></div></div>';

		return $calendario;
	}

  function formataDataBr($data) {
    if(strlen($data) >= 10) {
      $data = explode("-", $data);
      return $data[2]."/".$data[1]."/".$data[0];
    }
  }

  function formataDataHoraBr($dataHora) {
    if(strlen($dataHora) >= 19) {
      $dataHora = explode(" ", $dataHora);
      $data = explode("-", $dataHora[0]);
      return $data[2]."/".$data[1]."/".$data[0]." ".$dataHora[1];
    }
  }

  function formataDataSQL($data) {
    if(strlen($data) >= 10) {
      $data = explode("/", $data);
      return $data[2]."-".$data[1]."-".$data[0];
    }
  }

  function formataDataHoraSQL($dataHora) {
    if(strlen($dataHora) >= 19) {
      $dataHora = explode(" ", $dataHora);
      $data = explode("/", $dataHora[0]);
      return $data[2]."-".$data[1]."-".$data[0]." ".$dataHora[1];
    }
  }

  function dataValida($data) {
    if (preg_match("/^(\d{4})-(\d{2})-(\d{2})$/", $data)) {
        return true;
    }
    return false;
  }

  function verificaArquivo($arquivo) {
    if(is_array($arquivo)) {
      if(in_array(basename($_SERVER['PHP_SELF']), $arquivo)) {
        return true;
      } else {
        return false;
      }
    } else {
      if(basename($_SERVER['PHP_SELF']) == $arquivo) {
        return true;
      } else {
        return false;
      }
    }
  }