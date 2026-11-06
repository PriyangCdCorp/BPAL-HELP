---
type: guide
title: FAQ – Contrôle du point de livraison
description: >-
  FAQ: Contrôlez l’accès à des points de livraison (déchargement) spécifiques
  dans la cour : Nombre maximum de véhicules défini par l’utilisateur par point
  de livraison.
tags:
  - cdcprod
  - faq
status: active
generated:
  by: 'script:buildOkfBundle'
  at: '2026-10-22'
sources:
  - id: faq-3
    resource: CDCPROD/French/FAQ.txt
    title: FAQ.txt
---
# FAQ – Contrôle du point de livraison

Contrôlez l’accès à des points de livraison (déchargement) spécifiques dans la cour :

Nombre maximum de véhicules défini par l’utilisateur par point de livraison.
Les feux de signalisation indiquent si le système acceptera un autre véhicule au point de livraison mis en évidence.
Intégré à l’enregistrement à la balance pour interdire l’entrée des véhicules affectés à un point de livraison spécifique lorsque le nombre maximum de véhicules pour ce point de livraison a été atteint.
Service d’interface matérielle de la zone de transit (contrôle du point de livraison)
Conçu pour s’interfacer directement avec le matériel périphérique du point de livraison tel que le boîtier d’affichage lumineux rouge/vert pour fournir tous les services automatisés pour l’exécution d’événements dictés par un cycle de contrôle du point de livraison. L’interface matérielle de contrôle des points de livraison a été développée en tant que service Windows; elle entre en fonction lors du démarrage du système d’exploitation sur le serveur BPAL. Change les voyants du tableau d’affichage de chaque point de livraison en rouge ou vert en fonction du nombre maximum de véhicules défini par l’utilisateur à un point de livraison spécifique. Lorsqu’un véhicule effectue un Scale IN ou Scale OUT, le nombre de véhicules à chaque point de livraison est réévalué et les voyants rouges/verts de la boîte d’affichage supérieur sont ajustés en conséquence

## Related

- [FAQ](./faq.md)
- [FAQ – Contrôle d’accès](./faq-controle-d-acces.md)
- [FAQ – Balance et enregistrement](./faq-balance-et-enregistrement.md)
- [FAQ – Collecte d’échantillons](./faq-collecte-d-echantillons.md)
