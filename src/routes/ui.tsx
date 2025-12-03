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
    { value: "es", label: "Español" },
    { value: "en", label: "Inglés" },
    { value: "ca", label: "Catalán" },
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
                <p className="text-sm uppercase tracking-wide text-bsc-blue-medium">Kit UI del BSC</p>
                <h1 className="text-3xl font-bold text-bsc-blue-dark">Galería de componentes</h1>
                <p className="text-gray-600 mt-2 max-w-2xl">
                    Revisa los componentes primitivos disponibles, copia los ejemplos y úsalos en cualquier pantalla.
                </p>
            </header>

            <SectionWrapper>
                <SectionTitle>Botones</SectionTitle>
                <div className="flex flex-wrap gap-3">
                    <Button variant="primary">Primario</Button>
                    <Button variant="secondary">Secundario</Button>
                    <Button variant="outline">Contorno</Button>
                    <Button variant="ghost">Transparente</Button>
                    <Button variant="danger">Peligro</Button>
                    <Button size="sm">Pequeño</Button>
                    <Button size="lg">Grande</Button>
                    <Button fullWidth className="max-w-xs">
                        Ancho completo
                    </Button>
                </div>
            </SectionWrapper>

            <SectionWrapper>
                <SectionTitle>Campos de formulario</SectionTitle>
                <div className="grid gap-6 md:grid-cols-2">
                    <Input label="Campo de texto" placeholder="Escribe algo..." helperText="Texto auxiliar" />
                    <Input label="Campo con error" placeholder="Estado con error" error="Mensaje de error" />
                    <Select label="Selector" defaultValue="es" options={selectOptions} helperText="Opciones básicas" />
                    <Select label="Selector deshabilitado" disabled value="es" options={selectOptions} />
                    <Textarea label="Área de texto" rows={4} placeholder="Texto multilínea" />
                    <Textarea label="Área con error" error="Requerido" rows={4} />
                </div>
            </SectionWrapper>

            <SectionWrapper>
                <SectionTitle>Insignias</SectionTitle>
                <div className="flex flex-wrap gap-3">
                    <Badge>Etiqueta</Badge>
                    <Badge variant="success">Éxito</Badge>
                    <Badge variant="warning">Advertencia</Badge>
                    <Badge variant="danger">Peligro</Badge>
                    <Badge variant="info" icon={<span className="text-base">ℹ️</span>}>
                        Información + ícono
                    </Badge>
                    <Badge variant="outline" size="sm">
                        Compacto
                    </Badge>
                </div>
            </SectionWrapper>

            <SectionWrapper>
                <SectionTitle>Controles de selección</SectionTitle>
                <div className="grid gap-4">
                    <Checkbox label="Casilla" helperText="Texto auxiliar" defaultChecked />
                    <Checkbox label="Casilla con error" error="Requerido" />
                    <Checkbox label="Indeterminado" indeterminate description="Ideal para seleccionar grupos" />
                    <Switch label="Interruptor" description="Activa o desactiva" defaultChecked />
                    <Switch label="Interruptor con error" error="Debe estar activo" />
                </div>
            </SectionWrapper>

            <SectionWrapper>
                <SectionTitle>Alertas</SectionTitle>
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
