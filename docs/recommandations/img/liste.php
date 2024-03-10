<?php
$nb_fichier = 0;
echo '<ul>';
if($dossier = opendir('.'))
{
	while(false !== ($fichier = readdir($dossier)))
	{
		if($fichier != '.' && $fichier != '..' && $fichier != 'liste.php')
		{
			$nb_fichier++; // On incrémente le compteur de 1
			//vérifie s'il s'agit d'une image
			$ext = substr($fichier, -3); 
			if($ext=="jpg" || $ext=="png")
				echo '<li><a href="' . $fichier . '"><img src="' . $fichier . '" /></a></li>';
			else 
				echo '<li><a href="' . $fichier . '">' . $fichier . '</a></li>';
		}		
	}
echo '</ul><br />';
echo 'Il y a <strong>' . $nb_fichier .'</strong> fichier(s) dans le dossier';
  
closedir($dossier);
  
}else
     echo 'Le dossier n\' a pas pu être ouvert';