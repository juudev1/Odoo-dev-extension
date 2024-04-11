import FieldListItem from './FieldListItem';

const RecordValues = ({ values }) => {
    if (!Array.isArray(values)) {
        return null;
    }

    return (
        <div>
            <h5 class="mt-2 mb-2 text-lg font-semibold tracking-tight text-sky-700">Record Values</h5>
            <ul className='flex flex-col gap-2'>
                {values.map((field) => {
                    return <FieldListItem field={field} />
                })}
            </ul>
        </div>
    )
}

export default RecordValues;    