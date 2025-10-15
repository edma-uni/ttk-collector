# TTK Collector - TikTok Event Consumer Microservice

A NestJS-based background worker microservice that consumes TikTok events from NATS JetStream, validates them using Zod schemas, and persists them to PostgreSQL.

## Architecture

This service is a **consumer microservice** that:
- ✅ Automatically subscribes to `raw.events.tiktok.>` NATS subject on startup
- ✅ Validates incoming messages using Zod schemas
- ✅ Persists valid events to PostgreSQL using Prisma
- ✅ Implements robust error handling with acknowledgment strategies
- ✅ Exposes Prometheus metrics for monitoring
- ✅ Automatically runs database migrations on startup

## Core Components

### 1. EventConsumerService ([event.service.ts](src/event/event.service.ts))
The main service that handles event processing:
- **Automatic subscription**: Subscribes to `raw.events.tiktok.>` on module initialization
- **Message handling pipeline**: Validate → Persist → Acknowledge
- **Error handling**:
  - **Validation errors**: Logged and acknowledged (prevents redelivery)
  - **Processing errors**: Logged but NOT acknowledged (allows NATS redelivery)

### 2. NatsConsumerService ([nats-consumer.service.ts](src/nats/nats-consumer.service.ts))
Manages NATS JetStream connections and subscriptions:
- Durable consumer with explicit acknowledgment
- Automatic reconnection on connection failures
- Configurable retry policy (max 5 deliveries, 30s ack wait)

### 3. MetricsService ([metrics.service.ts](src/metrics/metrics.service.ts))
Prometheus metrics for monitoring:
- `collector_events_received_total` - Total events received from NATS
- `collector_events_processed_total` - Successfully processed events
- `collector_events_failed_total` - Failed events (validation/processing)
- `collector_event_processing_duration_seconds` - Processing latency histogram
- `collector_nats_connection_status` - NATS connection health

### 4. PrismaService ([prisma.service.ts](src/prisma/prisma.service.ts))
Database access with automatic migrations:
- Runs `prisma migrate deploy` on startup
- Connects to PostgreSQL
- Provides type-safe database access

## Data Flow

```
NATS JetStream (raw.events.tiktok.>)
         ↓
NatsConsumerService (subscribe)
         ↓
EventConsumerService.handleTiktokEvent()
         ↓
    [Validate with Zod]
         ↓
  [Persist to PostgreSQL]
         ↓
    [Acknowledge message]
         ↓
  [Update metrics]
```

## Error Handling Strategy

| Error Type | Action | Reasoning |
|------------|--------|-----------|
| **Validation Error** (Zod) | Acknowledge message | Invalid data won't become valid on retry |
| **Processing Error** (DB, etc.) | DO NOT acknowledge | Transient errors may resolve on retry |

## Configuration

Environment variables in [.env](.env):

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tiktok_events?schema=public"

# NATS
NATS_URL="nats://localhost:4222"

# Application
PORT=3001
NODE_ENV=development
HOSTNAME=ttk-collector-local
```

## Database Schema

The service stores events in the `TiktokEvent` table:

```prisma
model TiktokEvent {
  id          String   @id @default(cuid())
  eventId     String   @unique
  timestamp   DateTime
  funnelStage String
  eventType   String
  data        Json
  createdAt   DateTime @default(now())

  @@index([timestamp])
  @@index([eventType])
}
```

## Scripts

```bash
# Development
npm run start:dev          # Start with hot reload

# Production
npm run build              # Build the application
npm run start:prod         # Start production server

# Database
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate:dev # Create and apply migrations
npm run prisma:migrate:deploy # Apply migrations (production)
npm run prisma:studio      # Open Prisma Studio GUI

# Linting & Testing
npm run lint               # Lint and fix
npm run test               # Run tests
npm run test:cov           # Run tests with coverage
```

## Monitoring

### Metrics Endpoint
Prometheus metrics are exposed at: `http://localhost:3001/metrics`

### Key Metrics for Grafana Dashboards

**Collector Metrics** (to aggregate with gateway):
- `collector_events_received_total` - Rate of incoming events
- `collector_events_processed_total` - Rate of processed events
- `collector_events_failed_total` - Rate of failed events

**Performance Metrics**:
- `collector_event_processing_duration_seconds` - P50, P95, P99 latencies

**Health Metrics**:
- `collector_nats_connection_status` - Connection health (1=connected, 0=disconnected)

## Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- NATS Server with JetStream enabled

### Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`

3. Run database migrations:
```bash
npm run prisma:migrate:dev
```

4. Generate Prisma client:
```bash
npm run prisma:generate
```

5. Start the service:
```bash
npm run start:dev
```

### Testing with NATS

Publish a test event to NATS:

```bash
nats pub raw.events.tiktok.top.video.view '{
  "eventId": "test-123",
  "timestamp": "2025-01-15T10:00:00Z",
  "source": "tiktok",
  "funnelStage": "top",
  "eventType": "video.view",
  "data": {
    "user": {
      "userId": "user-123",
      "username": "testuser",
      "followers": 1000
    },
    "engagement": {
      "watchTime": 30,
      "percentageWatched": 75,
      "device": "iOS",
      "country": "US",
      "videoId": "video-456"
    }
  }
}'
```

## Integration with Infrastructure

This service integrates with the existing infrastructure:

- **NATS JetStream**: Consumes from `RAW_EVENTS` stream
- **PostgreSQL**: Stores events in `TiktokEvent` table
- **Prometheus/Grafana**: Exposes metrics for monitoring

## Troubleshooting

### Service won't start
- Check NATS connection: Ensure NATS is running on the configured URL
- Check database connection: Verify DATABASE_URL is correct
- Check migrations: Run `npm run prisma:migrate:deploy` manually

### Messages not being processed
- Check NATS consumer: Look for subscription confirmation in logs
- Check validation: Look for validation errors in logs
- Check database: Ensure PostgreSQL is accepting connections

### High error rate
- Check `collector_events_failed_total` metric for failure reasons
- Review logs for validation vs. processing errors
- Consider increasing `ack_wait` or `max_deliver` in NatsConsumerService

## License

UNLICENSED
