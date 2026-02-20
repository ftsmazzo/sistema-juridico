<?php
$crontext = "Cron Run at ".date("r")." by ".$_SERVER['USER']."\n" ;
$folder = substr($_SERVER['SCRIPT_FILENAME'],0,strrpos($_SERVER['SCRIPT_FILENAME'],"/")+1);
$filename = $folder."cron-test.txt" ;
$fp = fopen($filename,"a") or die("Open error!");
fwrite($fp, $crontext) or die("Write error!");
fclose($fp);
echo "Wrote to ".$filename."\n\n" ;
?>
