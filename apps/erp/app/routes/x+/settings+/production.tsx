import { error } from "@carbon/auth";
import { requirePermissions } from "@carbon/auth/auth.server";
import { flash } from "@carbon/auth/session.server";
import {
  Boolean,
  Number,
  Submit,
  ValidatedForm,
  validator
} from "@carbon/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Heading,
  Label,
  ScrollArea,
  toast,
  VStack
} from "@carbon/react";
import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useFetcher, useLoaderData } from "react-router";
import { z } from "zod/v3";
import { zfd } from "zod-form-data";
import { Users } from "~/components/Form";
import {
  getCompanySettings,
  jobCompletedValidator,
  maintenanceSettingsValidator
} from "~/modules/settings";
import type { Handle } from "~/utils/handle";
import { path } from "~/utils/path";

export const handle: Handle = {
  breadcrumb: "Production",
  to: path.to.productionSettings
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { client, companyId } = await requirePermissions(request, {
    view: "settings"
  });

  const companySettings = await getCompanySettings(client, companyId);

  if (!companySettings.data)
    throw redirect(
      path.to.settings,
      await flash(
        request,
        error(companySettings.error, "Failed to get company settings")
      )
    );
  return { companySettings: companySettings.data };
}

export async function action({ request }: ActionFunctionArgs) {
  const { client, companyId } = await requirePermissions(request, {
    update: "settings"
  });

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "maintenance") {
    const validation = await validator(maintenanceSettingsValidator).validate(
      formData
    );

    if (validation.error) {
      return { success: false, message: "Invalid form data" };
    }

    const update = await client
      .from("companySettings")
      .update({
        maintenanceGenerateInAdvance:
          validation.data.maintenanceGenerateInAdvance,
        maintenanceAdvanceDays: validation.data.maintenanceAdvanceDays
      })
      .eq("id", companyId);

    if (update.error) return { success: false, message: update.error.message };

    return { success: true, message: "Maintenance settings updated" };
  }

  if (intent === "jobCompleted") {
    const validation = await validator(jobCompletedValidator).validate(
      formData
    );

    if (validation.error) {
      return { success: false, message: "Invalid form data" };
    }

    const update = await client
      .from("companySettings")
      .update({
        inventoryJobCompletedNotificationGroup:
          validation.data.inventoryJobCompletedNotificationGroup ?? [],
        salesJobCompletedNotificationGroup:
          validation.data.salesJobCompletedNotificationGroup ?? []
      })
      .eq("id", companyId);

    if (update.error) return { success: false, message: update.error.message };

    return { success: true, message: "Job notification settings updated" };
  }

  return null;
}

export default function ProductionSettingsRoute() {
  const { companySettings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [maintenanceGenerateInAdvance, setMaintenanceGenerateInAdvance] =
    useState(companySettings.maintenanceGenerateInAdvance ?? false);

  useEffect(() => {
    if (fetcher.data?.success === true && fetcher?.data?.message) {
      toast.success(fetcher.data.message);
    }

    if (fetcher.data?.success === false && fetcher?.data?.message) {
      toast.error(fetcher.data.message);
    }
  }, [fetcher.data?.message, fetcher.data?.success]);

  return (
    <ScrollArea className="w-full h-[calc(100dvh-49px)]">
      <VStack
        spacing={4}
        className="py-12 px-4 max-w-[60rem] h-full mx-auto gap-4"
      >
        <Heading size="h3">Production</Heading>

        <Card>
          <ValidatedForm
            method="post"
            validator={jobCompletedValidator}
            defaultValues={{
              inventoryJobCompletedNotificationGroup:
                companySettings.inventoryJobCompletedNotificationGroup ?? [],
              salesJobCompletedNotificationGroup:
                companySettings.salesJobCompletedNotificationGroup ?? []
            }}
            fetcher={fetcher}
          >
            <input type="hidden" name="intent" value="jobCompleted" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Completed Job Notifications
              </CardTitle>
              <CardDescription>
                Configure notifications for when jobs are completed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-8 max-w-[400px]">
                <div className="flex flex-col gap-2">
                  <Label>Inventory Job Notifications</Label>
                  <Users
                    name="inventoryJobCompletedNotificationGroup"
                    label="Who should receive notifications when an inventory job is completed?"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Sales Job Notifications</Label>
                  <Users
                    name="salesJobCompletedNotificationGroup"
                    label="Who should receive notifications when a sales job is completed?"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Submit
                isDisabled={fetcher.state !== "idle"}
                isLoading={
                  fetcher.state !== "idle" &&
                  fetcher.formData?.get("intent") === "jobCompleted"
                }
              >
                Save
              </Submit>
            </CardFooter>
          </ValidatedForm>
        </Card>

        <Card>
          <ValidatedForm
            method="post"
            validator={maintenanceSettingsValidator}
            defaultValues={{
              maintenanceGenerateInAdvance:
                companySettings.maintenanceGenerateInAdvance ?? false,
              maintenanceAdvanceDays:
                companySettings.maintenanceAdvanceDays ?? 7
            }}
            fetcher={fetcher}
          >
            <input type="hidden" name="intent" value="maintenance" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Maintenance Scheduling
              </CardTitle>
              <CardDescription>
                Configure how preventative maintenance dispatches are
                automatically generated from maintenance schedules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6 max-w-[400px]">
                <div className="flex flex-col gap-2">
                  <Boolean
                    name="maintenanceGenerateInAdvance"
                    description="Create maintenance dispatches in advance."
                    value={maintenanceGenerateInAdvance}
                    onChange={setMaintenanceGenerateInAdvance}
                  />
                </div>
                {maintenanceGenerateInAdvance && (
                  <div className="flex flex-col gap-2">
                    <Number
                      name="maintenanceAdvanceDays"
                      label="Days in advance to generate dispatches"
                      minValue={1}
                      maxValue={365}
                    />
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Submit
                isDisabled={fetcher.state !== "idle"}
                isLoading={
                  fetcher.state !== "idle" &&
                  fetcher.formData?.get("intent") === "maintenance"
                }
              >
                Save
              </Submit>
            </CardFooter>
          </ValidatedForm>
        </Card>
      </VStack>
    </ScrollArea>
  );
}
