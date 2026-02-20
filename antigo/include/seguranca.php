<?
  class seguranca {
  	public function efetuarLogin($login, $senha) {
  		global $conexao;

  		$login = $conexao->real_escape_string($login);
  		$senha = md5($conexao->real_escape_string($senha));

  		$verfUsuario = $conexao->query("SELECT * FROM usuarios WHERE login='".$login."' AND senha='".$senha."' AND ativo=1");
  		if($verfUsuario && $verfUsuario->num_rows > 0) {
  			$dadosU = $verfUsuario->fetch_array(MYSQLI_ASSOC);
  			
  			$_SESSION['cod']     = $dadosU['id'];
  			$_SESSION['nome']    = $dadosU['nome']." ".$dadosU['sobrenome'];
  			$_SESSION['email']   = $dadosU['email'];
  			$_SESSION['celular'] = $dadosU['celular'];
  			$_SESSION['grupo']   = $dadosU['grupo'];
  			$_SESSION['logado']  = true;
  		} else {
  			$_SESSION['logado']  = false;
  		}
  		
  		return $_SESSION['logado'];
  	}

  	public function verificarLogin() {
  		if(!isset($_SESSION['logado']) || $_SESSION['logado'] == false) {
  			redireciona(URL_LOGIN);
  		}
  	}

  	public function efetuarLogout() {
  		session_destroy();
  		redireciona(URL_LOGIN);
  	}

    public function verificarGrupo($grupo) {
      if($grupo != $_SESSION['grupo']) {
        redireciona(URL_SISTEMA);
      }

    }
  }