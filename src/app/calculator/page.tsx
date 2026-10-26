import { requireUserId } from "@/lib/roles";
import { getCurrentOneRepMaxes } from "@/lib/data";
import { Calculator } from "@/components/Calculator";

export default async function CalculatorPage() {
  const userId = await requireUserId();
  const oneRepMaxes = await getCurrentOneRepMaxes(userId);

  const lifts = oneRepMaxes.map(({ lift, current }) => ({
    id: lift.id,
    name: lift.name,
    oneRepMax: current ? current.weight : null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold tracking-tight uppercase">
        Calculator
      </h1>
      <Calculator lifts={lifts} />
    </div>
  );
}
