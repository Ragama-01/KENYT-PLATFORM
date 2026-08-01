# 🚛 Kenyt Ops Platform — Complete Project Guide

> **A plain-English guide to understand the Kenyt Operations Platform**
> Written for people with no technical background.

---

## 📖 Table of Contents

1. [What Is This System?](#what-is-this-system)
2. [The Big Picture](#the-big-picture)
3. [The Four Main Screens](#the-four-main-screens)
4. [How the System Works Step by Step](#how-the-system-works-step-by-step)
5. [The Truck Allocation Engine](#the-truck-allocation-engine)
6. [Data the System Stores](#data-the-system-stores)
7. [How the Pieces Connect](#how-the-pieces-connect)
8. [Flow Charts & Diagrams](#flow-charts--diagrams)
9. [Glossary of Terms](#glossary-of-terms)

---

## 1. What Is This System?

**Kenyt Ops** is a **fleet management web application** built for a logistics company. It helps the operations team:

- 📝 **Record customer orders** (what cargo needs to be moved)
- 🚛 **Manage the truck fleet** (registration, capacity, compliance documents)
- 👨‍✈️ **Manage drivers** (who drives which truck)
- 🎯 **Match orders to the right truck** (the smart allocation engine)

Think of it as a **digital control room** for the entire trucking operation.

---

## 2. The Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                    KENYT OPS PLATFORM                           │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   ORDERS    │    │  ALLOCATE   │    │   TRUCKS    │         │
│  │  (Intake)   │───▶│  (Matching) │◀───│   (Fleet)   │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                  │                    │              │
│         │                  ▼                    │              │
│         │         ┌─────────────┐              │              │
│         │         │  ALLOCATION │              │              │
│         │         │   RECORD    │              │              │
│         │         └─────────────┘              │              │
│         │                  │                   │              │
│         ▼                  ▼                   ▼              │
│  ┌─────────────────────────────────────────────────────┐      │
│  │                 DATABASE (Storage)                  │      │
│  │  Orders • Trucks • Drivers • Locations • Allocations│      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                 │
│  ┌─────────────┐                                                │
│  │   DRIVERS   │                                                │
│  │ (Personnel) │                                                │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. The Four Main Screens

The app has a **sidebar menu** on the left with four sections:

### 📋 Orders (Intake & Consignment)
This is where the operations team **captures a new customer order**. The form asks for:

| Field | What It Means |
|-------|---------------|
| **BOL Number** | Bill of Lading — the official shipping document number |
| **Customer** | Who is sending the cargo |
| **Cargo Type** | What is being shipped (e.g., Cocoa, Electronics) |
| **Load Type** | FCL (full container), LCL (partial), Bulk, Reefer (refrigerated), Breakbulk |
| **Weight (Tonnes)** | How heavy the cargo is |
| **Pickup Location** | Where the truck needs to go to collect the cargo |
| **Delivery Location** | Where the cargo needs to be dropped off |
| **Consignee** | Who is receiving the cargo |
| **Free Storage Days** | How many days the cargo can stay at the port before fees apply |

### 🎯 Allocate (Match Order to Truck)
This is the **smart matching screen**. The user:
1. Selects a pending order from a dropdown
2. The system **automatically finds all suitable trucks**
3. The user **clicks to select** the truck they want
4. Clicks **"Allocate Truck"** to confirm

### 🚛 Trucks (Fleet & Compliance)
This is the **fleet register**. Each truck has:
- Registration number (e.g., KDX 946H)
- Year of manufacture
- **Capacity in tonnes** (how much weight it can carry)
- Trailer registration
- **Compliance documents** (insurance, inspection, speed governor, COMESA)

### 👨‍✈️ Drivers (Assignment & Records)
This is the **driver register**. Each driver has:
- Full name and ID number
- Which truck they're assigned to
- KRA PIN, phone, email, NSSF, SHIF numbers
- Date of joining and status

---

## 4. How the System Works Step by Step

### The Complete Workflow

```
STEP 1                    STEP 2                    STEP 3
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  Customer    │         │  Operations  │         │  System      │
│  places an   │ ──────▶ │  team enters │ ──────▶ │  saves the   │
│  order       │         │  order into  │         │  order in    │
│              │         │  the system  │         │  database    │
└──────────────┘         └──────────────┘         └──────────────┘
                                                          │
                                                          ▼
STEP 6                    STEP 5                    STEP 4
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  Truck is    │         │  User picks  │         │  System      │
│  marked as   │ ◀────── │  a truck and │ ◀────── │  finds all   │
│  "assigned"  │         │  clicks      │         │  suitable    │
│  and order   │         │  "Allocate"  │         │  trucks      │
│  is "done"   │         │              │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
```

### Detailed Walkthrough

**Step 1 — Order Entry**
The operations team receives a customer order (phone, email, or in person). They open the **Orders** screen and fill in the form with all the cargo details.

**Step 2 — Order Saved**
When they click "Save Order", the system stores the order in the database with a status of **"pending"** (waiting for a truck).

**Step 3 — Allocation Screen**
The system automatically takes the user to the **Allocate** screen, where the new order appears in the dropdown.

**Step 4 — Smart Truck Matching**
When the user selects an order, the system:
1. Looks at the **cargo weight** (e.g., 26 tonnes)
2. Looks at all trucks with status **"available"**
3. **Filters out** any truck whose capacity is less than the cargo weight
4. Calculates the **distance** from each truck's GPS location to the pickup point
5. **Sorts** the trucks from nearest to farthest

**Step 5 — User Selection**
The user sees a list of all suitable trucks, each showing:
- Registration number
- Capacity (tonnes)
- Distance from pickup point (km)

The nearest truck is **pre-selected** by default, but the user can click any truck to select it.

**Step 6 — Allocation Confirmed**
When the user clicks "Allocate Truck":
- The system creates an **allocation record** linking the order to the truck
- The truck's status changes from **"available"** to **"assigned"**
- The order's status changes from **"pending"** to **"allocated"**

---

## 5. The Truck Allocation Engine

This is the **brain** of the system. It decides which trucks are suitable for each order.

### The Two Rules

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRUCK ALLOCATION RULES                       │
│                                                                 │
│  RULE 1: WEIGHT CAPACITY                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Can the truck physically carry this cargo?             │    │
│  │                                                         │    │
│  │  Truck capacity (e.g., 43 tonnes)  ≥  Cargo weight      │    │
│  │  (e.g., 26 tonnes)                                      │    │
│  │                                                         │    │
│  │  ✅ YES → Truck is a candidate                          │    │
│  │  ❌ NO  → Truck is skipped                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  RULE 2: DISTANCE TO PICKUP                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  How far is the truck from the pickup point?            │    │
│  │                                                         │    │
│  │  Distance = straight-line distance between:             │    │
│  │    • Truck's GPS location (from tracking device)        │    │
│  │    • Pickup location coordinates (from database)        │    │
│  │                                                         │    │
│  │  Trucks are sorted: NEAREST FIRST                       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Example Scenario

Let's say an order comes in for **26 tonnes of cocoa** to be picked up at **Mombasa Port**:

| Truck | Capacity | Distance from Port | Suitable? |
|-------|----------|-------------------|-----------|
| KDX 946H | 43 t | 6.46 km | ✅ Yes |
| KDW 554E | 43 t | 11.94 km | ✅ Yes |
| KDN 387D | 43 t | 19.15 km | ✅ Yes |
| KDJ 821N | 28 t | 50.11 km | ✅ Yes |
| KCE 310S | 26 t | 916.52 km | ✅ Yes (exactly 26) |
| KCP 957R | 26 t | 917.42 km | ✅ Yes (exactly 26) |
| KCD 887V | 28 t | 789.45 km | ✅ Yes |
| KCE 820S | 26 t | 930.39 km | ✅ Yes (exactly 26) |
| *(any truck under 26 t)* | — | — | ❌ No — can't carry the load |

The system shows all ✅ trucks sorted by distance, with **KDX 946H** (6.46 km) at the top.

---

## 6. Data the System Stores

The system uses a **database** to store all information. Think of it as a set of **digital filing cabinets**:

### 📁 Cabinet 1: Orders
```
┌──────────────────────────────────────────────────────────────┐
│  ORDER RECORD                                                │
├──────────────────────────────────────────────────────────────┤
│  Order ID: 2                                                 │
│  BOL Number: sdf534656u7i                                    │
│  Customer: Anne Ragama                                       │
│  Cargo: 26 tonnes of Cocoa (LCL)                             │
│  Pickup: Mombasa Port                                        │
│  Delivery: [destination location]                            │
│  Consignee: RANDOM GUY                                       │
│  Status: pending → allocated                                 │
└──────────────────────────────────────────────────────────────┘
```

### 📁 Cabinet 2: Trucks
```
┌──────────────────────────────────────────────────────────────┐
│  TRUCK RECORD                                                │
├──────────────────────────────────────────────────────────────┤
│  Truck ID: 29                                                │
│  Registration: KDX 946H                                      │
│  Capacity: 43 tonnes                                         │
│  Status: available → assigned                                │
│  GPS Location: [latitude, longitude]                         │
│  Compliance: insurance ✓, inspection ✓, speed governor ✓     │
└──────────────────────────────────────────────────────────────┘
```

### 📁 Cabinet 3: Drivers
```
┌──────────────────────────────────────────────────────────────┐
│  DRIVER RECORD                                               │
├──────────────────────────────────────────────────────────────┤
│  Driver ID: 1                                                │
│  Name: John Doe                                              │
│  ID Number: 12345678                                         │
│  Assigned Truck: KDX 946H                                    │
│  KRA PIN, Phone, Email, NSSF, SHIF                           │
│  Status: active                                              │
└──────────────────────────────────────────────────────────────┘
```

### 📁 Cabinet 4: Locations
```
┌──────────────────────────────────────────────────────────────┐
│  LOCATION RECORD                                             │
├──────────────────────────────────────────────────────────────┤
│  Location ID: 1                                              │
│  Name: Mombasa Port                                          │
│  Latitude: -4.0435                                           │
│  Longitude: 39.6682                                          │
│  Type: pickup / delivery                                     │
└──────────────────────────────────────────────────────────────┘
```

### 📁 Cabinet 5: Allocations
```
┌──────────────────────────────────────────────────────────────┐
│  ALLOCATION RECORD                                           │
├──────────────────────────────────────────────────────────────┤
│  Allocation ID: 1                                            │
│  Order ID: 2                                                 │
│  Truck ID: 25                                                │
│  Allocated At: 2026-08-01 07:10:22                           │
│  Status: allocated                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. How the Pieces Connect

### The Technology Stack (in plain English)

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOW THE SYSTEM IS BUILT                      │
│                                                                 │
│  ┌──────────────────────┐                                       │
│  │   FRONTEND (Screen)  │  What the user sees and clicks        │
│  │   React + Tailwind   │  Runs in the web browser              │
│  └──────────┬───────────┘                                       │
│             │  Sends requests (e.g., "find trucks for order 2") │
│             ▼                                                   │
│  ┌──────────────────────┐                                       │
│  │   BACKEND (Brain)    │  The logic that processes requests    │
│  │   Fastify (Node.js)  │  Runs on the server                   │
│  └──────────┬───────────┘                                       │
│             │  Reads/writes data                                │
│             ▼                                                   │
│  ┌──────────────────────┐                                       │
│  │   DATABASE           │  Where all records are stored         │
│  │   PostgreSQL + Prisma│  The digital filing cabinets          │
│  └──────────────────────┘                                       │
│                                                                 │
│  ┌──────────────────────┐                                       │
│  │   GPS TRACKING       │  Optional: truck locations from       │
│  │   (Control-Tech)     │  tracking devices on each truck       │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
```

### How a Request Flows Through the System

```
USER CLICKS "SELECT ORDER 2"
        │
        ▼
┌─────────────────┐
│  FRONTEND       │  Sends: "GET /allocations/suggest/2"
│  (Browser)      │  (Find trucks for order 2)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  BACKEND        │  1. Looks up order 2 in the database
│  (Server)       │  2. Gets the cargo weight (26 tonnes)
│                 │  3. Gets the pickup location (Mombasa Port)
│                 │  4. Finds all available trucks
│                 │  5. Filters by capacity (≥ 26 tonnes)
│                 │  6. Calculates distance for each truck
│                 │  7. Sorts nearest first
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DATABASE       │  Returns: order data, truck data, locations
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  BACKEND        │  Packages the results into a clean response
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  FRONTEND       │  Displays the list of suitable trucks
│  (Browser)      │  with capacity and distance
└─────────────────┘
```

---

## 8. Flow Charts & Diagrams

### Flow Chart 1: Order Lifecycle

```
                    ┌─────────────┐
                    │  NEW ORDER  │
                    │   CREATED   │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   STATUS:   │
                    │  "pending"  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  USER GOES  │
                    │   TO THE    │
                    │ ALLOCATE    │
                    │   SCREEN    │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  USER       │
                    │  SELECTS    │
                    │  THE ORDER  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  SYSTEM     │
                    │  FINDS      │
                    │  SUITABLE   │
                    │  TRUCKS     │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  USER       │
                    │  PICKS A    │
                    │  TRUCK      │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  USER       │
                    │  CLICKS     │
                    │  "ALLOCATE" │
                    └──────┬──────┘
                           │
                           ▼
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
    ┌─────────────────┐      ┌─────────────────┐
    │  TRUCK STATUS   │      │  ORDER STATUS   │
    │  "available" →  │      │  "pending" →    │
    │  "assigned"     │      │  "allocated"    │
    └─────────────────┘      └─────────────────┘
```

### Flow Chart 2: Truck Recommendation Logic

```
                    ┌─────────────────┐
                    │  ORDER SELECTED │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  GET ORDER      │
                    │  DETAILS        │
                    │  (weight,       │
                    │  pickup point)  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  GET ALL        │
                    │  AVAILABLE      │
                    │  TRUCKS         │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  FOR EACH       │
                    │  TRUCK:         │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  Does the    │  │  Does the    │  │  Calculate   │
    │  truck have  │  │  truck have  │  │  distance    │
    │  a GPS       │  │  enough      │  │  from truck  │
    │  location?   │  │  capacity?   │  │  to pickup   │
    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
           │                 │                 │
      NO───┘            NO───┘                 │
           │                 │                 │
           ▼                 ▼                 │
    ┌──────────────┐  ┌──────────────┐         │
    │  SKIP THIS   │  │  SKIP THIS   │         │
    │  TRUCK       │  │  TRUCK       │         │
    └──────────────┘  └──────────────┘         │
                                               │
                                               ▼
                                    ┌─────────────────┐
                                    │  ADD TRUCK TO   │
                                    │  CANDIDATE LIST │
                                    │  (with distance)│
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  SORT BY        │
                                    │  DISTANCE       │
                                    │  (nearest first)│
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  SHOW LIST TO   │
                                    │  USER           │
                                    └─────────────────┘
```

### Flow Chart 3: Allocation Confirmation

```
                    ┌─────────────────┐
                    │  USER CLICKS    │
                    │  "ALLOCATE      │
                    │  TRUCK"         │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  CREATE         │
                    │  ALLOCATION     │
                    │  RECORD         │
                    │  (order + truck)│
                    └────────┬────────┘
                             │
                             ▼
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  UPDATE      │  │  UPDATE      │  │  SHOW        │
    │  TRUCK       │  │  ORDER       │  │  SUCCESS     │
    │  STATUS →    │  │  STATUS →    │  │  MESSAGE     │
    │  "assigned"  │  │  "allocated" │  │  TO USER     │
    └──────────────┘  └──────────────┘  └──────────────┘
```

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        KENYT OPS PLATFORM                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    USER INTERFACE (Browser)                  │   │
│  │                                                             │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │   │
│  │  │ ORDERS  │  │ALLOCATE │  │ TRUCKS  │  │ DRIVERS │        │   │
│  │  │  Form   │  │  Screen │  │  List   │  │  List   │        │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │   │
│  └───────┼────────────┼────────────┼────────────┼─────────────┘   │
│          │            │            │            │                 │
│          ▼            ▼            ▼            ▼                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    API SERVER (Backend)                     │   │
│  │                                                             │   │
│  │  /orders        /allocations        /trucks    /drivers     │   │
│  │  /locations     /allocations/suggest/:id                    │   │
│  │                                                             │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │           ALLOCATION ENGINE (The Brain)             │    │   │
│  │  │                                                    │    │   │
│  │  │  1. Check weight capacity                          │    │   │
│  │  │  2. Calculate distance (Haversine formula)         │    │   │
│  │  │  3. Sort nearest first                             │    │   │
│  │  │  4. Allocate selected truck                        │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             │                                      │
│                             ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      DATABASE (Storage)                     │   │
│  │                                                             │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │   │
│  │  │ ORDERS  │  │ TRUCKS  │  │ DRIVERS │  │LOCATIONS│        │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │   │
│  │  ┌─────────┐  ┌─────────┐                                   │   │
│  │  │ALLOCAT- │  │ TRUCK   │                                   │   │
│  │  │ IONS    │  │LOCATIONS│                                   │   │
│  │  └─────────┘  └─────────┘                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              GPS TRACKING (Optional)                        │   │
│  │  Control-Tech devices on trucks send location updates       │   │
│  │  → stored in Truck Locations table                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. Glossary of Terms

| Term | Plain-English Meaning |
|------|----------------------|
| **BOL (Bill of Lading)** | The official document that proves cargo was received for shipping |
| **Consignee** | The person or company receiving the cargo |
| **FCL** | Full Container Load — the cargo fills an entire container |
| **LCL** | Less than Container Load — the cargo shares a container with other shipments |
| **Bulk** | Loose cargo not in containers (e.g., grain, sand) |
| **Reefer** | Refrigerated container for temperature-sensitive cargo |
| **Breakbulk** | Cargo that is individually loaded (not in containers) |
| **Capacity (tonnes)** | The maximum weight a truck can legally carry |
| **Allocation** | The act of assigning a specific truck to a specific order |
| **Available** | Truck status meaning it's ready for a new assignment |
| **Assigned** | Truck status meaning it's been given an order |
| **Pending** | Order status meaning it's waiting for a truck |
| **Allocated** | Order status meaning a truck has been assigned to it |
| **GPS Location** | The truck's current position from its tracking device |
| **Haversine Formula** | A math formula that calculates the distance between two points on Earth |
| **Database** | The digital storage system where all records are kept |
| **Frontend** | The part of the app the user sees and interacts with |
| **Backend** | The part of the app that processes logic and data |
| **API** | The communication channel between the frontend and backend |
| **COMESA** | A regional trade agreement requiring specific insurance for cross-border transport |
| **NSSF** | National Social Security Fund (Kenya) |
| **SHIF** | Social Health Insurance Fund (Kenya) |
| **KRA PIN** | Kenya Revenue Authority tax identification number |

---

## Quick Summary

> **Kenyt Ops** is a digital control room for a trucking company. It lets the operations team:
>
> 1. **Record orders** — what cargo needs to move, from where, to where
> 2. **Match trucks** — the system automatically finds all trucks that can carry the load, sorted by how close they are to the pickup point
> 3. **Choose and allocate** — the user picks the best truck and confirms the assignment
> 4. **Track everything** — trucks, drivers, compliance documents, and allocation history are all stored in one place
>
> The **allocation engine** uses two simple rules: **can the truck carry the weight?** and **how far is the truck from the pickup?** — then lets the human make the final decision.