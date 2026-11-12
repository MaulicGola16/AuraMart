# ✨ AuraMart AI — Cloud-Native Retail Platform

**AuraMart AI** is a microservices-based retail e-commerce web application featuring AI-driven semantic search optimization, real-time item-similarity recommendations, an interactive AI shopping assistant, user authentication, and persistent shopping cart management. It is containerized with Docker and deployed on **Azure Kubernetes Service (AKS)** via an external **LoadBalancer**.

---

## 🏗️ System Architecture & Microservices

The application is decoupled into **5 independent microservices** backed by **MySQL** and **MongoDB**:

| Microservice | Port | Exposure | Database | Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **`frontend-gateway`** | `5000` | `LoadBalancer` (Port 80) | None | Serves the storefront UI, dedicated login screen, floating chatbot widget, and proxies `/api/*` traffic to internal services. |
| **`catalog-service`** | `5001` | `ClusterIP` | **MySQL** | Manages the relational product catalog (`products`), user authentication (`users`), and persistent shopping carts (`cart_items`). |
| **`search-service`** | `5002` | `ClusterIP` | None (via Catalog API) | AI Search Optimization engine performing semantic synonym expansion and weighted relevance ranking. |
| **`recommendation-service`** | `5003` | `ClusterIP` | None (via Catalog API) | AI Recommendation engine computing real-time product similarity scores using shared semantic tags and category affinity. |
| **`chatbot-service`** | `5004` | `ClusterIP` | **MongoDB** | AI Retail Concierge (`AuraBot`) answering product, budget, shipping, and return queries while persisting chat logs in MongoDB. |

---

## 🚀 Key Features

- **Dedicated User Authentication:** Full-screen login and instant registration portal with pre-configured demo credentials (`maulic@auramart.in` / `1234`).
- **AI Semantic Search Optimization:** Expands natural-language shopper queries (e.g., *"jogging gear"*, *"coding setup"*, *"party wear"*) into domain-specific synonyms and ranks products by relevance score.
- **Real-Time AI Product Recommendations:** Dynamically computes and displays top matching items whenever a user selects a product card.
- **AuraBot Floating AI Assistant:** Interactive bottom-right chat popup backed by MongoDB for persistent conversation history.
- **Persistent MySQL Shopping Cart:** Supports adding, updating quantities, and removing items per logged-in user.

---

## 📂 Project Structure

```text
AuraMart/
├── frontend-gateway/        # Storefront UI & API Gateway (Port 5000)
│   ├── public/
│   │   └── index.html
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── catalog-service/         # Products, Auth & Cart Service + MySQL (Port 5001)
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── search-service/          # AI Semantic Search Microservice (Port 5002)
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── recommendation-service/  # AI Recommendation Microservice (Port 5003)
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── chatbot-service/         # AI Chatbot Microservice + MongoDB (Port 5004)
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── k8s/                     # Kubernetes Manifests for AKS
│   ├── configmap.yaml
│   ├── databases.yaml
│   ├── microservices-deployments.yaml
│   └── microservices-services.yaml
├── docker-compose.yml       # Multi-container local orchestration
└── README.md