BPAL FULL FORM IS Bulk Procurement and Logistics Management System (BPAL)


The BPAL Experience
BPAL is a comprehensive system combining state-of-the-art software and hardware used by mills producing pulp, paper, paper container products, panel board products, bioenergy, bio-fuel plants and recycling facilities. BPAL is utilized when integrated as a component within the Raw Material Supply Chain Infrastructure which is responsible to handle bulk feedstock procurement.

It was recognized at the initial conception of BPAL’s framework that two inter related and necessarily interconnected software partitions would be required to deliver efficiently and effectively at client facilities all the perceived operational services.

CDC’s client community has members from multiple industrial sectors all of whom had been identified as having common operational attributes thereby allowing for standardization of computerized services which were assessed to be extremely beneficial.

Thus, when the mapping of the high-level software partitions was completed, it was concluded that the incorporation of an automation partition having extensive computerized services to manage and control real-time event occurrences while concurrently minimizing manual participation would be an essential component.

Secondly, all incorporated automation action events of this partition would have to be tightly integrated to a corresponding administrative partition and all such cooperative integration would result in the creation of appropriate features that meet the business objectives of the select client community. Hence, a summary of the operational features of BPAL’s two structural components includes the following namely:

Automation
BPAL’s Real-Time Management and Control features provide an advanced level of automation to handle bulk procurement workflow processes. For example, all workflow processes at stations such as Access Control (Entry and Exit), Inbound and Outbound Weigh Scale Registration, Sample Collection for feedstock Quality Analysis, Unloading and Receiving, and Delivery Point Control become highly automated using BPAL. More detail of these operational features is narrated below:

Access Control

A pre-assigned barcoded Card or Release used when entering the premises permit the monitoring and tracking of subsequent events that a delivery will cycle through.

Barcode card readers connected to BPAL and placed at locations where an action will take place make it possible to collect data on that event.
Allows for traffic monitoring, transaction processing of events including the date and time
All data is posted to the transaction created at Entry and stored in the BPAL database.
Personnel wishing to view a traffic profile can request events based on a specific selection criteria.  
Online display and/or reports are generated in response to the request for information.
Yard Gate (Access Control) Hardware Interface Service
Designed to directly interface with the yard gate peripheral hardware such as gate activation relays, bar-code reader and trucker display (screen or light) to provide all the automated services for the execution of events dictated by an access control cycle.  The Yard Gate Hardware Interface was developed as a Windows Service, is started when the Operating System on the BPAL Server is started and is independent of the Access Control User Interface.  Reading the bar-coded card, validating the entry, activating the relay to open the gate, sending alerts to the security officer are all responsibilities of the Yard Gate Hardware Interface Service.

Delivery Point Control

Control access to specific delivery (unloading) points in the yard:

User defined maximum number of vehicles per delivery point.
Signal lights indicate whether system will accept another vehicle at the highlighted delivery point.
Integrated with Registration at Weigh Scale to disallow entry of vehicles assigned to a specific delivery point when the maximum number of vehicles for that delivery point has been reached.
Staging Area (Delivery Point Control) Hardware Interface Service
Designed to directly interface with the Delivery Point peripheral hardware such as the overhead red/green light display Box to provide all the automated services for the execution of events dictated by a delivery point control cycle.  The Delivery Point Control Hardware Interface was developed as a Windows Service and is started when the Operating System on the BPAL Server.  Changes lights on display board for each delivery point to red or green depending on a user defined maximum number of vehicles at a specific delivery point.  When a vehicle performs a Scale IN or Scale OUT, the vehicle counts at each delivery point are re-evaluated and the overhead display Box red / green lights are adjusted accordingly.

Weigh Scale & Registration

At entry/exit, for manned or unmanned operations, the Barcoded ID is used to identify information such as Vendor, Origin, Product, Contract, Vehicle, Delivery Schedule and more.

Traffic lights ensure proper vehicle flow.
Detection sensors are used for automatic truck scale zeroing and proper vehicle positioning.
Easy-to-follow automated sequencing guides the entire operation from entry to exit.
Net weight will be calculated as the absolute value.
Weigh Scale & Registration (Truck Scale) Hardware Interface Service
Designed to directly interface with the truck scale peripheral hardware such as the vehicle detectors, traffic lights, truck scale indicator, bar-code reader, RFID reader and ticket printer and to provide all the automated services for the execution of events dictated by a weighing cycle.  The Truck Scale Hardware Interface was developed as a Windows Service, is started when the Operating System on the BPAL Server is started and is independent of the Truck Scale User Interface.  Zeroing the truck scale upon vehicle detection, signaling the truck driver via traffic lights as to the state of the truck scale, ensuring the vehicle is properly centered on the truck scale before an official weight request can be processed are all responsibilities of the Truck Scale Hardware Interface Service.

Sample Collection

Sample collection can be performed manually or by automated sampling equipment interfaced to BPAL.

BPAL offers a unique method to reduce the volume of sample testing and can be configured by Product or by Vendor Contract without giving advance knowledge that a specific vehicle is to be tested.
Unloading and Receiving

Bar-coded ID scanned to identify delivery and ensure the product is authorised to unload at the specific delivery point.

BPAL interfaces with dumper PLC and issues a Go/No-Go signal to the controller preventing the unloading of a product into the wrong delivery point avoiding accidental product contamination.
Unloading & Receiving (Dumper) Hardware Interface Service
Designed to directly interface with the dumper peripheral hardware such as the dumper activation relays or PLC and bar-code reader to provide all the automated services for the execution of events dictated by a weighing cycle.  The Dumper Hardware Interface was developed as a Windows Service, is started when the Operating System on the BPAL Server is started and is independent of the Dumper User Interface.  Reading the bar-coded card, validating the entry, activating the relay to activate the dumper are all responsibilities of the Dumper Hardware Interface Service.

Quality Analysis

Test parameters can be any defined contaminant. Quality Analysis protocols and limits are user defined by contract, product and individual data collection element
Test results are saved in real-time using a direct link to the specific delivery based on unique ID.
Menu driven testing procedures define automated steps allowing for single or composite testing of many samples.
Testing procedures are tailored to increase productivity as computer-interfaced laboratory equipment makes manual recording a thing of the past.
Chip Lab Quality Analysis (Gradex / Rader) Hardware Interface Service
Designed to directly interface with the Chip Size Classifier PC to provide all the automated services for the execution of events dictated by a chip size classification cycle.  The Chip Size Classifier Interface was developed as a Windows Service, is started when the Operating System on the BPAL Server is started and is independent of the Gradex User Interface.  Receiving chip size classifier data from the BPAL classifier transfer program installed on the Gradex / Rader PC and applying the results to the appropriate delivery quality information stored in the BPAL database is the responsibility of the Chip Size Classifier Hardware Interface Service.

 
Get in touch
Circuit Design Corporation
8170 Montview Road, Suite 210
Montreal, Quebec
Canada H4P 2L7

Telephone: 514-738-7640 ext. 22
Email: info@cdcorp.ca

 
Download our flyer
Download our brouchure


   
 Copyright 2021. All Rights Reserved.


Skip to content
 1-514-738-7640 ext. 22
About Us
Contact Us
French
Search & hit enter...
Circuit Design Corporation
Home
BPAL
BPAL Experience
BPAL Administration
Industries
Services & Support
ROI Calculator
Our Clients
NEWS
BPAL Administration

BPAL ADMINISTRATION
BPAL Administration components are provided through a secure user based access allowing an authorized user to perform Administrative and Management functions such as establishing Vendors, Products, Contracts, Payment types, Payment Rates, Bar coded cards, etc.

Incorporated BPAL Administrative Features: 

Master Tables

Feature, creation and maintenance of database tables for a host of parameters such as supplier ID, carrier ID, product types and their codes etc.

Purchase of Feedstock in bulk 

Features

– creation of supplier/carrier contracts define standardized client specific parameters that are retrieved from the appropriate Master tables during the contract creation process.  Using the normalized Contract Format, specific client customization is based on a facility management’s precise business rules which become BPAL integrated methods that are then available for the contract creation process. Typical contract business rules allow for the selection of multiple rates for a mapped multiple period table, product profiles, quantity, unit of measure, chose of sampling methods each corresponding to a spaced frequency cycle that is explicitly defined.

Creation of Feedstock Delivery Transactions 
Features

A delivery transaction is immediately created following the completion of the inbound vehicle weigh cycle process. This is then stored in the transaction database. Other associated data, which originate from multiple related transaction event sources, are then progressively posted to the transaction database.

Examples of transaction events include:

inbound/outbound weigh processing cycle generates a weight data element that is inserted within its corresponding transaction record all of which enables calculating the gross weight received by the facility. For this transaction event, the calculation that could take place would be inbound less outbound measured vehicle weights for bulk feedstock reception and the reverse for outbound external delivery of other stock
contaminant evaluation using extracted samples whose selection is derived using a delivery cycle method. Samples are examined in a lab using client selectable testing protocols to evaluate content amounts by percent for specifically defined contaminants. Results are then utilized by client specific business rules that govern payment calculations, and which had been established by product type
payment calculation by choice of period such as weekly, biweekly, monthly or any other period format. BPAL includes proprietary sampling algorithms which select samples for testing. This process is applied to each retrieved supplier group of samples and significantly reduces overall lab test cycles. Results derived from all targeted sample tests of each supplier are utilized to generate either simple, weighted or rolling averages. The supplier selected averaging method is used by a generic transaction calculator to determine payment for the supplier’s corresponding set of transactions.
transaction corrections can be invoked by an authorized user. Upon detection of a correction, BPAL automatically creates a credit note to cancel the original invoice and a debit as a new replacement invoice. This cycle continues indefinitely and seamlessly traversing payment periods. All is automated to reflect the current reality. All data from such events is logged so that audits can be carried out when necessary to examine cause and reason to understand result. 
Business Intelligence
Features

-information is an asset. Its timely availability is an associated asset. BPAL treats both such considerations with significant thoroughness. Consequently, there are many information access features in BPAL. 

Examples of information access or transfer events include:

on-line information search access by authorized personnel using computer devices on the network of the facility and connected to BPAL’s Server. Such accesses show details in a precise format that corresponds to selected user input parameters derived by invoking one of many access methods incorporated in BPAL. 
information search access invoked by remote devises, and which can consist of mobile phones and remote laptops etc. all of which must be assigned to authorized personnel and all security protected by encryption techniques.
information transfer to external destinations all of which are inscribed under the security segment for this feature. Transfer of information is automatically executed based on date and time scheduling and is sent via email to specific and authorized staff and or external business entities as authorized. 
on-reports are available in real-time and can be accessed by authorized local remote users.
scheduler for information delivery to internal and or external recipients. Delivery of information utilizing the scheduler can be transferred different formats such as reports and or email. All such transfers are controlled by pre-set date and time assignments which are inserted by authorized personnel within the scheduler parameter profile. In addition, the scheduler is utilized to trigger a multitude of operational and or administrative functionalities to be performed at specified date and time settings all of which is controlled by authorized administrative personnel.  
connectivity to corporate systems utilizing WAN pathways permits user authorized information to be transferred to other remote corporate system
 
Get in touch
Circuit Design Corporation
8170 Montview Road, Suite 210
Montreal, Quebec
Canada H4P 2L7

Telephone: 514-738-7640 ext. 22
Email: info@cdcorp.ca

 
Download our flyer
Download our brouchure


   
 Copyright 2021. All Rights Reserved.

Skip to content
 1-514-738-7640 ext. 22
About Us
Contact Us
French
Search & hit enter...
Circuit Design Corporation
Home
BPAL
BPAL Experience
BPAL Administration
Industries
Services & Support
ROI Calculator
Our Clients
NEWS
About Us

OUR STORY

Founded in 1978, CDC draws on decades of software engineering skill and experience in creating comprehensive software and hardware solutions. CDC’s team consists of resolute professionals whose combined knowledge of software development and industry processes have been key to our success. 

In the early stages, CDC was a custom software developer focused on two streams, shop floor control applications and business system applications in the mini-computer environment.

One of CDC’s mandates was to develop a custom application for automating bulk raw material deliveries on a weigh-scale, bringing together development experience from both the shop floor control and business systems streams.

With the advent of a true multi-tasking, multi-threading operating system in the late 80’s, CDC shifted development from the more costly mini-computer environment to the more cost-effective PC environment.



Over the years, the custom application CDC developed for automating bulk raw material deliveries grew in scope and functionality based on user requirements and multiple implementations.

Based on the expanded scope and increased demand for the system, in the mid 2000’s, CDC transitioned from custom software development to a “product” centric model.

CDC’s Bulk Procurement and Logistics Management System (BPAL) was born.

 
Get in touch
Circuit Design Corporation
8170 Montview Road, Suite 210
Montreal, Quebec
Canada H4P 2L7

Telephone: 514-738-7640 ext. 22
Email: info@cdcorp.ca

 
Download our flyer
Download our brouchure


   
 Copyright 2021. All Rights Reserved.
