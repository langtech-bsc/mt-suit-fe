import { createFileRoute } from "@tanstack/react-router";
import { ReactNode } from "react";
import {
    Alert,
    Badge,
    Button,
    Card,
    Checkbox,
    Input,
    Select,
    Switch,
    Textarea,
} from "../components/ui";

const selectOptions = [
    { value: "es", label: "Spanish" },
    { value: "en", label: "English" },
    { value: "ca", label: "Catalan" },
];

export const Route = createFileRoute("/ui")({
    component: UIShowcase,
});

function SectionTitle({ children }: { children: string }) {
    return <h2 className="text-lg font-semibold text-bsc-blue-dark">{children}</h2>;
}

function SectionWrapper({ children }: { children: ReactNode }) {
    return (
        <Card padding="lg" className="space-y-6">
            {children}
        </Card>
    );
}

function UIShowcase() {
    return (
        <div className="space-y-8 bg-gradient-to-b from-white to-blue-50/40 p-6">
            <header>
                <p className="text-sm uppercase tracking-wide text-bsc-blue-medium">BSC UI Toolkit</p>
                <h1 className="text-3xl font-bold text-bsc-blue-dark">Component Showcase</h1>
                <p className="text-gray-600 mt-2 max-w-2xl">
                    Revisa los componentes primitivos disponibles, copia los ejemplos y úsalos en cualquier pantalla.
                </p>
            </header>

            <SectionWrapper>
                <SectionTitle>Buttons</SectionTitle>
                <div className="flex flex-wrap gap-3">
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="danger">Danger</Button>
                    <Button size="sm">Small</Button>
                    <Button size="lg">Large</Button>
                    <Button fullWidth className="max-w-xs">
                        Full width
                    </Button>
                </div>
            </SectionWrapper>

            <SectionWrapper>
                <SectionTitle>Form Fields</SectionTitle>
                <div className="grid gap-6 md:grid-cols-2">
                    <Input label="Input" placeholder="Escribe algo..." helperText="Texto auxiliar" />
                    <Input label="Input con error" placeholder="Error state" error="Mensaje de error" />
                    <Select label="Select" defaultValue="es" options={selectOptions} helperText="Opciones básicas" />
                    <Select label="Select deshabilitado" disabled value="es" options={selectOptions} />
                    <Textarea label="Textarea" rows={4} placeholder="Texto multilinea" />
                    <Textarea label="Textarea con error" error="Requerido" rows={4} />
                </div>
            </SectionWrapper>

            <SectionWrapper>
                <SectionTitle>Badges</SectionTitle>
                <div className="flex flex-wrap gap-3">
                    <Badge>Etiqueta</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="danger">Danger</Badge>
                    <Badge variant="info" icon={<span className="text-base">ℹ️</span>}>
                        Info + icono
                    </Badge>
                    <Badge variant="outline" size="sm">
                        Compacto
                    </Badge>
                </div>
            </SectionWrapper>

            <SectionWrapper>
                <SectionTitle>Selection Controls</SectionTitle>
                <div className="grid gap-4">
                    <Checkbox label="Checkbox" helperText="Texto auxiliar" defaultChecked />
                    <Checkbox label="Checkbox con error" error="Requerido" />
                    <Checkbox label="Indeterminado" indeterminate description="Ideal para seleccionar grupos" />
                    <Switch label="Switch" description="Activa o desactiva" defaultChecked />
                    <Switch label="Switch con error" error="Debe estar activo" />
                </div>
            </SectionWrapper>

            <SectionWrapper>
                <SectionTitle>Alerts</SectionTitle>
                <div className="space-y-4">
                    <Alert title="Información" description="Mensajes neutros para el usuario." />
                    <Alert variant="success" title="Listo">
                        Puedes mostrar contenido adicional con children.
                        <div className="mt-2 flex gap-2">
                            <Button size="sm">Aceptar</Button>
                            <Button variant="ghost" size="sm">
                                Cancelar
                            </Button>
                        </div>
                    </Alert>
                    <Alert variant="warning" title="Cuidado" description="Acciones sensibles necesitan confirmación." />
                    <Alert variant="danger" title="Error" description="Algo salió mal, inténtalo de nuevo." />
                </div>
            </SectionWrapper>
        </div>
    );
}
