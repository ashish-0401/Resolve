import amqplib, { Channel, Connection } from 'amqplib';

// CONCEPT: RabbitMQ Service (Settlement Notifications)
// When Bob marks a payment as paid, we don't send the push notification synchronously
// in the HTTP request — that would block Bob's request while we call the Web Push API
// (which involves network latency, retries, and rate limits).
//
// Instead, we publish a message to RabbitMQ and return immediately. A consumer
// (running in the same process for now) picks it up asynchronously and sends the
// notification. If the consumer crashes before ACKing, RabbitMQ redelivers.
//
// Interview: "I decouple payment confirmation from notification delivery using RabbitMQ.
// The HTTP request returns immediately, and the consumer handles delivery with at-least-once
// semantics. Redis deduplication prevents double-sends on redelivery."

const EXCHANGE = 'resolve.notifications';
const QUEUE = 'settlement.notifications';
const ROUTING_KEY = 'payment.completed';

let connection: Connection | null = null;
let channel: Channel | null = null;

async function getChannel(): Promise<Channel> {
  if (channel) return channel;

  const url = process.env.RABBITMQ_URL;
  if (!url) {
    throw new Error('RABBITMQ_URL is not set — check your .env file');
  }

  connection = await amqplib.connect(url);
  channel = await connection.createChannel();

  // Declare exchange and queue
  await channel.assertExchange(EXCHANGE, 'direct', { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

  // Prefetch 1 — process one message at a time
  await channel.prefetch(1);

  return channel;
}

export interface PaymentMessage {
  paymentId: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
  groupId: string;
  groupName: string;
  messageId: string;
}

/**
 * Publish a payment notification message to RabbitMQ.
 */
export async function publishPaymentNotification(message: PaymentMessage): Promise<void> {
  const ch = await getChannel();
  ch.publish(
    EXCHANGE,
    ROUTING_KEY,
    Buffer.from(JSON.stringify(message)),
    {
      persistent: true, // survive broker restart
      messageId: message.messageId,
    }
  );
}

/**
 * Start consuming payment notification messages.
 * The handler should ACK messages after processing.
 */
export async function startNotificationConsumer(
  handler: (message: PaymentMessage, ack: () => void, nack: () => void) => Promise<void>
): Promise<void> {
  const ch = await getChannel();

  ch.consume(QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const data: PaymentMessage = JSON.parse(msg.content.toString());
      await handler(
        data,
        () => ch.ack(msg),
        () => ch.nack(msg, false, true) // requeue on failure
      );
    } catch (err) {
      console.error('Error processing notification message:', err);
      ch.nack(msg, false, true); // requeue
    }
  });

  console.log('📬 RabbitMQ notification consumer started');
}
