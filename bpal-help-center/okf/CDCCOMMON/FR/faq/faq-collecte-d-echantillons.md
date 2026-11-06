---
type: guide
title: FAQ – Collecte d’échantillons
description: >-
  FAQ: On peut effectuer le prélèvement des échantillons manuellement ou par un
  équipement d’échantillonnage automatisé connecté au BPAL.
tags:
  - cdccommon
  - faq
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: faq-5
    resource: CDCCOMMON/French/FAQ.txt
    title: FAQ.txt
---
# FAQ – Collecte d’échantillons

On peut effectuer le prélèvement des échantillons manuellement ou par un équipement d’échantillonnage automatisé connecté au BPAL.

BPAL propose une méthode unique pour réduire le volume de tests d’échantillons et qui peut être configurée par produit ou par contrat avec le fournisseur sans que l’on sache à l’avance qu’un véhicule précis doit être testé.
Déchargement et réception

Code-barres numérisé pour identifier la livraison et garantir que le produit est autorisé à être déchargé au point de livraison spécifique.
BPAL s’interface avec l’automate de déchargement et émet un signal Go / No-Go au contrôleur empêchant le déchargement d’un produit dans le mauvais point de livraison, évitant ainsi une contamination accidentelle du produit.
Service d’interface matérielle de déchargement et de réception (tombereau)
Conçu pour s’interfacer directement avec le matériel périphérique du tombereau comme les relais d’activation du tombereau ou le PLC et le lecteur de code-barres pour fournir tous les services automatisés pour l’exécution d’événements dictés par un cycle de pesage. L’interface matérielle du tombereau a été développée en tant que service Windows; elle entre en fonction lors du démarrage du système d’exploitation sur le serveur BPAL; elle est indépendante de l’interface utilisateur du tombereau. La lecture de la carte à code-barres, la validation de l’entrée, l’activation du relais pour activer le tombereau sont toutes sous la responsabilité du service d’interface matériel du tombereau.

## Related

- [FAQ – Contrôle du point de livraison](./faq-controle-du-point-de-livraison.md)
- [FAQ – Balance et enregistrement](./faq-balance-et-enregistrement.md)
- [FAQ – Analyse de la qualité](./faq-analyse-de-la-qualite.md)
