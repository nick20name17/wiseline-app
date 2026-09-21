// Must be rendered inside a <dl>.
export const Fact = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className='flex flex-col gap-1'>
      <dt className='text-xs tracking-widest text-muted-foreground uppercase'>{label}</dt>
      <dd className='font-medium'>{value}</dd>
    </div>
  )
}
