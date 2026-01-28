import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET");
    return new Response("Error: Missing webhook secret", { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error: Invalid signature", { status: 400 });
  }

  const eventType = evt.type;

  switch (eventType) {
    case "organization.created": {
      const { id, name } = evt.data;
      // Organization will be created through the onboarding flow
      // This webhook can be used for additional setup if needed
      console.log(`Organization created: ${name} (${id})`);
      break;
    }

    case "organization.updated": {
      const { id, name } = evt.data;
      await db.organization.updateMany({
        where: { clerkOrgId: id },
        data: { name },
      });
      break;
    }

    case "organization.deleted": {
      const { id } = evt.data;
      if (id) {
        await db.organization.deleteMany({
          where: { clerkOrgId: id },
        });
      }
      break;
    }

    case "organizationMembership.created": {
      const { organization, public_user_data } = evt.data;
      const orgId = organization?.id;
      const userId = public_user_data?.user_id;

      if (orgId && userId) {
        const org = await db.organization.findUnique({
          where: { clerkOrgId: orgId },
        });

        if (org) {
          // Check if member already exists
          const existingMember = await db.organizationMember.findFirst({
            where: {
              organizationId: org.id,
              clerkUserId: userId,
            },
          });

          if (!existingMember) {
            await db.organizationMember.create({
              data: {
                organizationId: org.id,
                clerkUserId: userId,
                firstName: public_user_data.first_name || "Unknown",
                lastName: public_user_data.last_name || "",
                email:
                  public_user_data.identifier ||
                  `${userId}@placeholder.local`,
                role: "STAFF",
              },
            });
          }
        }
      }
      break;
    }

    case "organizationMembership.deleted": {
      const { organization, public_user_data } = evt.data;
      const orgId = organization?.id;
      const userId = public_user_data?.user_id;

      if (orgId && userId) {
        const org = await db.organization.findUnique({
          where: { clerkOrgId: orgId },
        });

        if (org) {
          await db.organizationMember.deleteMany({
            where: {
              organizationId: org.id,
              clerkUserId: userId,
            },
          });
        }
      }
      break;
    }

    default:
      console.log(`Unhandled webhook event: ${eventType}`);
  }

  return new Response("OK", { status: 200 });
}
