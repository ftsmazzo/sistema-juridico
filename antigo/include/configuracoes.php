<?
  session_start();
  date_default_timezone_set('America/Sao_Paulo');

  define("SERVIDOR", "localhost");
  define("USUARIO", "agenda_agendacv");
  define("SENHA", "agenda1234");
  define("BANCO", "agenda_agendacv");

  define("MailPort",     "587");
  define("MailHost",     "smtp.agendacv.com.br");
  define("MailUsername", "sendmail@agendacv.com.br");
  define("MailPassword", "c751v842");
  define("MailName",     "Agenda | Coelho Vignini");

  define("URL_SISTEMA", "http://www.agendacv.com.br/");
  define("URL_LOGIN", "http://www.agendacv.com.br/login.php");