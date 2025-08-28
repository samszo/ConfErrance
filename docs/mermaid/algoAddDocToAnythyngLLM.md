flowchart TD
    updateDocIA(["Ajouter des documents dans AnythingLLM"]) --> getOmkRag["Récupère les documents dans Omeka S"]
    getOmkRag --> B{"Il y a des documents ?"}
    B -- Oui --> parcoursData@{ shape: procs, label: "Pour la liste de documents"}    
    B -- Non --> U(["Fin de l'ajout"])
    parcoursData --> docInWorkspace{"Le document est dans AnythingLLM ? "} -- Oui --> parcoursData
    docInWorkspace -- Non --> constructChunk["Construction du CHUNK"] 
    --> addToAnythingLLM["Ajoute à AnythingLLM"]
    --> addToAnythingLLMworspace["Ajoute au Workspace de l'utilisateur connecté"]
    --> updateDocOmeka["Met à jour les références du document dans Omeka S"]
    updateDocOmeka --> docVide{"Fin de la liste ? "} -- Non --> parcoursData
    docVide -- "Oui (page +1)" --> getOmkRag