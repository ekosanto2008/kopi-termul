import KitchenGuard from '@/components/kitchen/KitchenGuard';

export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <KitchenGuard>
      {children}
    </KitchenGuard>
  );
}
