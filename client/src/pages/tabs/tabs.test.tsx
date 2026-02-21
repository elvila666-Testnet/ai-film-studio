import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

describe('Tabs Component', () => {
    it('renders triggers', () => {
        render(
            <Tabs defaultValue="a">
                <TabsList>
                    <TabsTrigger value="a">Trigger A</TabsTrigger>
                    <TabsTrigger value="b">Trigger B</TabsTrigger>
                </TabsList>
            </Tabs>
        );
        expect(screen.getByText('Trigger A')).toBeTruthy();
        expect(screen.getByText('Trigger B')).toBeTruthy();
    });
});
