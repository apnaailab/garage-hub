import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Printer, Sparkles, Plus, Car, History, Clock, Wrench, Camera } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { PageHeader } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Input, Select, Textarea, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DamageDiagram } from '@/components/shared/DamageDiagram';
import { SERVICES, CATEGORY_META, serviceById } from '@/lib/workflows';
import { searchVehicles, findVehicle, type VehicleRecord } from '@/lib/vehicles';
import { formatCurrency, formatDate, uid, nowISO, cn } from '@/lib/utils';
import type { ConsentLanguage, DamageMarker, DamageType, FuelLevel, InsuranceType, IntakeScenario, JobCard, JobPriority, PhotoTag, ServiceCategory, VehicleItemCondition } from '@/types';

const schema = z.object({
  vehicleNo: z
    .string()
    .min(6, 'Enter a valid registration number')
    .transform((v) => v.toUpperCase().replace(/\s+/g, '')),
  make: z.string().min(2, 'Required'),
  model: z.string().min(1, 'Required'),
  year: z.coerce.number().min(1990).max(2027),
  color: z.string().min(2, 'Required'),
  odometer: z.coerce.number().min(0),
  fuelLevel: z.enum(['E', '1/4', '1/2', '3/4', 'F']),
  customerName: z.string().min(2, 'Required'),
  customerPhone: z.string().min(10, 'Enter a valid phone'),
  customerAddress: z.string().optional(),
  customerConcerns: z.string().min(3, 'Note the customer concern'),
  referralSource: z.string().min(1, 'Required'),
  priority: z.enum(['low', 'normal', 'high']),
  etaHours: z.coerce.number().min(1).max(240),
  estimateTime: z.string().optional(),
  dropOff: z.boolean().optional(),
  intakeScenario: z.enum(['existing-walk-in', 'existing-pickup', 'new-walk-in', 'new-pickup']),
  insuranceType: z.enum(['zero-depreciation', 'comprehensive', 'third-party', 'no-valid-insurance']),
  consentLanguage: z.enum(['english', 'hindi', 'marathi', 'kannada']),
});

type FormValues = z.infer<typeof schema>;

const FUEL: FuelLevel[] = ['E', '1/4', '1/2', '3/4', 'F'];
const DAMAGE_TYPES: DamageType[] = ['scratch', 'dent', 'crack', 'peeling', 'rust'];
const REFERRAL_SOURCES = [
  'Google Search',
  'Instagram',
  'Facebook',
  'Referral (Friend)',
  'Repeat Customer',
  'Walk-in',
  'Insurance',
  'Other',
];
const MIN_EXTERIOR = 8;
const MIN_INTERIOR = 2;
const VEHICLE_ITEMS = ['Service Book', 'Manual', 'Floor Mat Set', 'Idol', 'Mud Flaps', 'Spare Tire', 'Jack', 'Handle', 'Wheel Caps', 'Safety Triangle', 'Dicky Mat', 'Tool Kit', 'Air Freshener', 'Speakers', 'Stereo', 'Key Chain'];

export function Intake({ onPrint }: { onPrint: (id: string) => void }) {
  const addJob = useStore((s) => s.addJob);
  const addCustomer = useStore((s) => s.addCustomer);
  const jobs = useStore((s) => s.jobs);
  const customers = useStore((s) => s.customers);

  const [services, setServices] = useState<string[]>([]);
  const [markers, setMarkers] = useState<DamageMarker[]>([]);
  const [damageType, setDamageType] = useState<DamageType>('scratch');
  const [created, setCreated] = useState<JobCard | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRecord | null>(null);
  const [entryPhotos, setEntryPhotos] = useState<{ url: string; tag: PhotoTag }[]>([]);
  const [vehicleItems, setVehicleItems] = useState<Record<string, VehicleItemCondition | ''>>({});

  const extCount = entryPhotos.filter((p) => p.tag === 'exterior').length;
  const intCount = entryPhotos.filter((p) => p.tag === 'interior').length;
  const photosOk = extCount >= MIN_EXTERIOR && intCount >= MIN_INTERIOR;

  const capturePhoto = (tag: PhotoTag) =>
    setEntryPhotos((prev) => [
      ...prev,
      { url: `https://picsum.photos/seed/intake-${Date.now()}-${prev.length}/640/420`, tag },
    ]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fuelLevel: '1/2',
      priority: 'normal',
      year: 2023,
      etaHours: 24,
      odometer: 0,
      referralSource: '',
      estimateTime: '15:00',
      dropOff: false,
      intakeScenario: 'existing-walk-in',
      insuranceType: 'comprehensive',
      consentLanguage: 'english',
    },
  });

  const vehicleNoValue = watch('vehicleNo') ?? '';
  const suggestions = showSuggest ? searchVehicles(jobs, vehicleNoValue) : [];

  const total = services.reduce((s, id) => s + (serviceById(id)?.price ?? 0), 0);

  const toggleService = (id: string) =>
    setServices((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  /** Populate the form from a known vehicle's history. */
  const applyVehicle = (v: VehicleRecord) => {
    const cust = customers.find((c) => c.id === v.customerId);
    setValue('vehicleNo', v.vehicleNo, { shouldValidate: true });
    setValue('make', v.make, { shouldValidate: true });
    setValue('model', v.model, { shouldValidate: true });
    setValue('year', v.year, { shouldValidate: true });
    setValue('color', v.color, { shouldValidate: true });
    setValue('odometer', v.lastOdometer, { shouldValidate: true });
    setValue('fuelLevel', v.lastFuelLevel);
    if (cust) {
      setValue('customerName', cust.name, { shouldValidate: true });
      setValue('customerPhone', cust.phone, { shouldValidate: true });
      setValue('customerAddress', cust.address ?? '');
    }
    setSelectedVehicle(v);
    setShowSuggest(false);
  };

  const onSubmit = (data: FormValues) => {
    if (services.length === 0 || !photosOk) return;
    // Returning vehicle → reuse the existing customer; new vehicle → create one.
    const known = findVehicle(jobs, data.vehicleNo);
    const customerId = known ? known.customerId : uid('cus');
    if (!known) {
      addCustomer({
        id: customerId,
        name: data.customerName,
        phone: data.customerPhone,
        address: data.customerAddress,
      });
    }

    let estimateReadyBy: string | undefined;
    if (data.estimateTime) {
      const [h, m] = data.estimateTime.split(':').map(Number);
      const d = new Date();
      d.setHours(h || 15, m || 0, 0, 0);
      estimateReadyBy = d.toISOString();
    }

    const job: JobCard = {
      id: `JC-${Math.floor(2048 + Math.random() * 900)}`,
      vehicleNo: data.vehicleNo,
      make: data.make,
      model: data.model,
      year: data.year,
      color: data.color,
      fuelLevel: data.fuelLevel,
      odometer: data.odometer,
      customerId,
      serviceIds: services,
      currentStage: 'entry',
      stageHistory: [{ stage: 'entry', at: nowISO() }],
      priority: data.priority as JobPriority,
      intakeScenario: data.intakeScenario as IntakeScenario,
      insuranceType: data.insuranceType as InsuranceType,
      consentLanguage: data.consentLanguage as ConsentLanguage,
      vehicleItems: Object.entries(vehicleItems)
        .filter((entry): entry is [string, VehicleItemCondition] => Boolean(entry[1]))
        .map(([name, condition]) => ({ name, condition })),
      damageMarkers: markers,
      photos: entryPhotos.map((p) => ({
        id: uid('ph'),
        url: p.url,
        tag: p.tag,
        caption: p.tag === 'exterior' ? 'Exterior condition' : 'Interior condition',
        uploadedBy: 'Reception',
        uploadedAt: nowISO(),
      })),
      parts: [],
      notes: [],
      createdAt: nowISO(),
      estimatedDelivery: new Date(Date.now() + data.etaHours * 3600_000).toISOString(),
      customerConcerns: data.customerConcerns,
      referralSource: data.referralSource,
      estimateReadyBy,
      advanceApproved: false,
      extraWorkApproved: null,
      paid: false,
      notifications: [
        {
          id: uid('ntf'),
          at: nowISO(),
          channel: 'whatsapp',
          to: 'customer',
          message: 'Your vehicle has been checked in at the workshop.',
        },
      ],
      ...(data.dropOff || data.intakeScenario.endsWith('pickup')
        ? {
            pickupDrop: {
              type: (data.intakeScenario.endsWith('pickup') ? (data.dropOff ? 'both' : 'pickup') : 'drop') as 'pickup' | 'drop' | 'both',
              address: data.customerAddress ?? '',
              scheduledAt: new Date(Date.now() + data.etaHours * 3600_000).toISOString(),
              status: 'scheduled' as const,
            },
          }
        : {}),
    };
    addJob(job);
    setCreated(job);
  };

  const resetAll = () => {
    reset();
    setServices([]);
    setMarkers([]);
    setEntryPhotos([]);
    setVehicleItems({});
    setCreated(null);
    setSelectedVehicle(null);
  };

  if (created) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Card className="p-8 text-center animate-scale-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950">
            <Check className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-extrabold">Job Card Created</h2>
          <p className="mt-1 text-sm text-ink-400">
            {created.vehicleNo} · {created.make} {created.model}
          </p>
          <p className="mt-4 inline-block rounded-lg bg-ink-900 px-3 py-1.5 font-mono text-sm font-bold text-white dark:bg-brand-600">
            {created.id}
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={resetAll}>
              <Plus className="h-4 w-4" /> New Intake
            </Button>
            <Button className="flex-1" onClick={() => onPrint(created.id)}>
              <Printer className="h-4 w-4" /> Print Job Card
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader title="Express Intake" subtitle="Create a new job card in under a minute" />

      {selectedVehicle && <ReturningVehicleBanner record={selectedVehicle} />}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="pt-5">
              <h3 className="mb-4 font-bold">Visit & Insurance</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Intake scenario">
                  <Select {...register('intakeScenario')}>
                    <option value="existing-walk-in">Existing · Walk in</option>
                    <option value="existing-pickup">Existing · Pickup</option>
                    <option value="new-walk-in">New · Walk in</option>
                    <option value="new-pickup">New · Pickup</option>
                  </Select>
                </Field>
                <Field label="Insurance type">
                  <Select {...register('insuranceType')}>
                    <option value="zero-depreciation">0 Depreciation</option>
                    <option value="comprehensive">Comprehensive</option>
                    <option value="third-party">Third Party</option>
                    <option value="no-valid-insurance">No Valid Insurance</option>
                  </Select>
                </Field>
                <Field label="Consent language">
                  <Select {...register('consentLanguage')}>
                    <option value="english">English</option>
                    <option value="hindi">Hindi</option>
                    <option value="marathi">Marathi</option>
                    <option value="kannada">Kannada</option>
                  </Select>
                </Field>
              </div>
              <p className="mt-3 text-xs text-ink-400">Pickup jobs require the applicable disclosure, disclaimer and insurance declaration before dispatch.</p>
            </CardContent>
          </Card>

          {/* vehicle */}
          <Card>
            <CardContent className="pt-5">
              <h3 className="mb-4 font-bold">Vehicle Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Registration No." error={errors.vehicleNo?.message}>
                  <VehicleNoField
                    register={register}
                    suggestions={suggestions}
                    onFocus={() => setShowSuggest(true)}
                    onChangeExtra={() => {
                      setShowSuggest(true);
                      setSelectedVehicle(null);
                    }}
                    onBlurExtra={() => setTimeout(() => setShowSuggest(false), 150)}
                    onPick={applyVehicle}
                  />
                </Field>
                <Field label="Make" error={errors.make?.message}>
                  <Input placeholder="Honda" {...register('make')} />
                </Field>
                <Field label="Model" error={errors.model?.message}>
                  <Input placeholder="City" {...register('model')} />
                </Field>
                <Field label="Year" error={errors.year?.message}>
                  <Input type="number" {...register('year')} />
                </Field>
                <Field label="Colour" error={errors.color?.message}>
                  <Input placeholder="Pearl White" {...register('color')} />
                </Field>
                <Field label="Odometer (km)" error={errors.odometer?.message}>
                  <Input type="number" {...register('odometer')} />
                </Field>
                <Field label="Fuel Level">
                  <Select {...register('fuelLevel')}>
                    {FUEL.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Priority">
                  <Select {...register('priority')}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </Select>
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <h3 className="mb-1 font-bold">Items in Vehicle</h3>
              <p className="mb-4 text-xs text-ink-400">Record present, missing or damaged items at handover.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {VEHICLE_ITEMS.map((item) => (
                  <label key={item} className="flex items-center gap-2 rounded-xl border border-ink-200 p-2.5 text-sm dark:border-ink-700">
                    <span className="min-w-0 flex-1 font-medium">{item}</span>
                    <select
                      value={vehicleItems[item] ?? ''}
                      onChange={(event) => setVehicleItems((current) => ({ ...current, [item]: event.target.value as VehicleItemCondition | '' }))}
                      className="rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs dark:border-ink-700 dark:bg-ink-800"
                    >
                      <option value="">Not noted</option>
                      <option value="present">Present</option>
                      <option value="missing">Missing</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* customer */}
          <Card>
            <CardContent className="pt-5">
              <h3 className="mb-4 font-bold">Customer Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" error={errors.customerName?.message}>
                  <Input placeholder="Full name" {...register('customerName')} />
                </Field>
                <Field label="Phone" error={errors.customerPhone?.message}>
                  <Input placeholder="+91 …" {...register('customerPhone')} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Address (optional)">
                    <Input placeholder="For pickup / drop" {...register('customerAddress')} />
                  </Field>
                </div>
                <Field label="How did you hear about us?" error={errors.referralSource?.message}>
                  <Select {...register('referralSource')}>
                    <option value="">Select…</option>
                    {REFERRAL_SOURCES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Customer concerns" error={errors.customerConcerns?.message}>
                    <Textarea
                      placeholder="What issues did the customer report? (noise, dents, service due…)"
                      {...register('customerConcerns')}
                    />
                  </Field>
                </div>
                <Field label="Est. Delivery (hours)" error={errors.etaHours?.message}>
                  <Input type="number" {...register('etaHours')} />
                </Field>
                <Field label="Primary estimate by">
                  <Input type="time" {...register('estimateTime')} />
                </Field>
                <div className="sm:col-span-2">
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-ink-200 p-3 text-sm dark:border-ink-700">
                    <input type="checkbox" className="h-4 w-4 accent-brand-600" {...register('dropOff')} />
                    <span className="font-medium">Customer needs drop-off service</span>
                    <span className="ml-auto text-xs text-ink-400">driver will be notified</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* mandatory photos */}
          <Card>
            <CardContent className="pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold">Vehicle Photos</h3>
                <span className={cn('text-xs font-semibold', photosOk ? 'text-emerald-600' : 'text-amber-600')}>
                  {photosOk ? 'Requirement met' : 'Mandatory'}
                </span>
              </div>
              <p className="mb-3 text-xs text-ink-400">
                Minimum {MIN_EXTERIOR} exterior + {MIN_INTERIOR} interior photos to record condition & damage.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <PhotoCounter
                  label="Exterior"
                  count={extCount}
                  min={MIN_EXTERIOR}
                  onAdd={() => capturePhoto('exterior')}
                />
                <PhotoCounter
                  label="Interior"
                  count={intCount}
                  min={MIN_INTERIOR}
                  onAdd={() => capturePhoto('interior')}
                />
              </div>
            </CardContent>
          </Card>

          {/* services */}
          <Card>
            <CardContent className="pt-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold">Select Services</h3>
                {services.length === 0 && (
                  <span className="text-xs text-amber-600">Pick at least one</span>
                )}
              </div>
              <div className="space-y-4">
                {(Object.keys(CATEGORY_META) as ServiceCategory[]).map((cat) => (
                  <div key={cat}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">
                      {CATEGORY_META[cat].label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SERVICES.filter((s) => s.category === cat).map((svc) => {
                        const active = services.includes(svc.id);
                        return (
                          <button
                            type="button"
                            key={svc.id}
                            onClick={() => toggleService(svc.id)}
                            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                              active
                                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                                : 'border-ink-200 hover:border-ink-300 dark:border-ink-700'
                            }`}
                          >
                            {active && <Check className="h-3.5 w-3.5" />}
                            <span className="font-medium">{svc.name}</span>
                            <span className="text-xs opacity-60">{formatCurrency(svc.price)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* right column: damage + summary */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-5">
              <h3 className="mb-3 font-bold">Damage & Scratches</h3>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {DAMAGE_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setDamageType(t)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                      damageType === t
                        ? 'bg-brand-600 text-white'
                        : 'bg-ink-100 text-ink-500 dark:bg-ink-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <DamageDiagram
                markers={markers}
                interactive
                onAdd={(x, y) =>
                  setMarkers((m) => [...m, { id: uid('dm'), x, y, type: damageType }])
                }
                onRemove={(id) => setMarkers((m) => m.filter((mk) => mk.id !== id))}
              />
            </CardContent>
          </Card>

          <Card className="sticky top-20">
            <CardContent className="pt-5">
              <h3 className="mb-3 flex items-center gap-2 font-bold">
                <Sparkles className="h-4 w-4 text-brand-500" /> Estimate
              </h3>
              {services.length === 0 ? (
                <p className="text-sm text-ink-400">Select services to see the estimate.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {services.map((id) => (
                    <li key={id} className="flex justify-between">
                      <span>{serviceById(id)?.name}</span>
                      <span className="font-medium">{formatCurrency(serviceById(id)?.price ?? 0)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 text-base font-extrabold dark:border-ink-800">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {markers.length > 0 && (
                <div className="mt-3">
                  <Badge tone="amber">{markers.length} damage points marked</Badge>
                </div>
              )}
              {!photosOk && (
                <p className="mt-3 text-xs text-amber-600">
                  Add {Math.max(MIN_EXTERIOR - extCount, 0)} more exterior &{' '}
                  {Math.max(MIN_INTERIOR - intCount, 0)} more interior photos.
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                className="mt-4 w-full"
                disabled={services.length === 0 || !photosOk}
              >
                Create Job Card
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
}

function PhotoCounter({
  label,
  count,
  min,
  onAdd,
}: {
  label: string;
  count: number;
  min: number;
  onAdd: () => void;
}) {
  const ok = count >= min;
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        ok ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20' : 'border-ink-200 dark:border-ink-700',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className={cn('text-xs font-bold', ok ? 'text-emerald-600' : 'text-amber-600')}>
          {count}/{min}
        </span>
      </div>
      <Button type="button" variant="outline" size="sm" className="mt-2 w-full" onClick={onAdd}>
        <Camera className="h-3.5 w-3.5" /> Add {label.toLowerCase()} photo
      </Button>
    </div>
  );
}

function VehicleNoField({
  register,
  suggestions,
  onFocus,
  onChangeExtra,
  onBlurExtra,
  onPick,
}: {
  register: UseFormRegister<FormValues>;
  suggestions: VehicleRecord[];
  onFocus: () => void;
  onChangeExtra: () => void;
  onBlurExtra: () => void;
  onPick: (v: VehicleRecord) => void;
}) {
  const reg = register('vehicleNo');
  return (
    <div className="relative">
      <div className="relative">
        <Car className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <Input
          placeholder="MH01AB1234"
          autoComplete="off"
          className="pl-9"
          name={reg.name}
          ref={reg.ref}
          onChange={(e) => {
            reg.onChange(e);
            onChangeExtra();
          }}
          onFocus={onFocus}
          onBlur={(e) => {
            reg.onBlur(e);
            onBlurExtra();
          }}
        />
      </div>
      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-11 z-30 animate-scale-in overflow-hidden rounded-xl border border-ink-200 bg-white shadow-xl dark:border-ink-700 dark:bg-ink-800">
          <p className="flex items-center gap-1.5 border-b border-ink-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ink-400 dark:border-ink-700">
            <History className="h-3 w-3" /> Known vehicles
          </p>
          {suggestions.map((v) => (
            <button
              type="button"
              key={v.vehicleNo}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(v);
              }}
              className="flex w-full items-center gap-3 border-b border-ink-100 px-3 py-2.5 text-left last:border-0 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-700/60"
            >
              <span className="rounded-md bg-ink-900 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white dark:bg-brand-600">
                {v.vehicleNo}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {v.make} {v.model} · {v.year}
              </span>
              <Badge tone="blue">{v.visits} visit{v.visits > 1 ? 's' : ''}</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReturningVehicleBanner({ record }: { record: VehicleRecord }) {
  const staff = useStore((s) => s.staff);
  return (
    <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-900/60 dark:bg-brand-950/30">
      <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300">
        <History className="h-5 w-5" />
        <p className="font-bold">
          Returning vehicle · {record.visits} previous visit{record.visits > 1 ? 's' : ''}
        </p>
        <Badge tone="blue" className="ml-auto">
          Details auto-filled
        </Badge>
      </div>
      <div className="mt-3 space-y-1.5">
        {record.jobs.slice(0, 4).map((j) => {
          const mech = staff.find((m) => m.id === j.assignedStaffId);
          return (
            <div
              key={j.id}
              className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs dark:bg-ink-900"
            >
              <span className="font-mono font-bold text-ink-500">{j.id}</span>
              <span className="flex items-center gap-1 text-ink-400">
                <Clock className="h-3 w-3" />
                {formatDate(j.createdAt)}
              </span>
              <span className="min-w-0 flex-1 truncate text-ink-600 dark:text-ink-300">
                {j.serviceIds.map((id) => serviceById(id)?.name).filter(Boolean).join(', ')}
              </span>
              <span className="flex items-center gap-1 text-ink-400" title="Worked by">
                <Wrench className="h-3 w-3" />
                {mech ? mech.name : 'Unassigned'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
