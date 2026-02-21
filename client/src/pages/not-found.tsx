
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center">
            <Card className="w-full max-w-md">
                <CardContent className="pt-6">
                    <div className="flex mb-4 gap-2">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                        <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
                    </div>

                    <p className="mt-4 text-sm text-gray-600">
                        Did you take a wrong turn?
                    </p>

                    <Link href="/">
                        <a className="mt-6 inline-block w-full text-center bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2">
                            Return to Dashboard
                        </a>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
